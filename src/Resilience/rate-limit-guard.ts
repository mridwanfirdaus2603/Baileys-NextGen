import type { ILogger } from '../Utils/logger'

export interface ProxyConfig {
	url: string
	protocol: 'http' | 'https' | 'socks5'
	auth?: {
		username: string
		password: string
	}
}

export type ProxyStrategy = 'round-robin' | 'random' | 'failover'

export interface ProxySwitcherOptions {
	proxies: ProxyConfig[]
	strategy?: ProxyStrategy
}

export interface RateLimitGuardOptions {
	maxRetries?: number
	baseDelayMs?: number
	maxDelayMs?: number
	circuitThreshold?: number
	circuitResetTimeoutMs?: number
	proxyOptions?: ProxySwitcherOptions
}

export interface RateLimitGuardStats {
	totalBlocked: number
	totalRetries: number
	activeProxyUrl: string | null
	circuitState: 'closed' | 'open' | 'half-open'
}

export function isRateLimitError(err: unknown): boolean {
	if (!err) return false

	if (typeof err === 'number' && err === 429) return true

	const msg =
		typeof err === 'object' && err !== null && 'message' in err
			? String((err as { message: unknown }).message)
			: String(err)

	const statusCode =
		typeof err === 'object' && err !== null && 'output' in err
			? (err as { output?: { statusCode?: number } }).output?.statusCode
			: undefined

	if (statusCode === 429) return true

	const lower = msg.toLowerCase()
	return (
		lower.includes('429') ||
		lower.includes('rate limit') ||
		lower.includes('too many requests') ||
		lower.includes('resource exhausted') ||
		lower.includes('over-rate')
	)
}

export class ProxySwitcher {
	private proxies: ProxyConfig[] = []
	private currentIndex = 0
	private failedProxies = new Set<string>()
	private strategy: ProxyStrategy

	constructor(options: ProxySwitcherOptions) {
		this.proxies = [...options.proxies]
		this.strategy = options.strategy ?? 'round-robin'
	}

	getNextProxy(): ProxyConfig | null {
		const available = this.proxies.filter(p => !this.failedProxies.has(p.url))
		if (available.length === 0) {
			this.failedProxies.clear()
			return this.proxies[0] ?? null
		}

		if (this.strategy === 'random') {
			const index = Math.floor(Math.random() * available.length)
			return available[index]!
		}

		if (this.strategy === 'failover') {
			return available[0]!
		}

		// round-robin default
		const proxy = available[this.currentIndex % available.length]!
		this.currentIndex = (this.currentIndex + 1) % available.length
		return proxy
	}

	markProxyFailed(url: string): void {
		this.failedProxies.add(url)
	}

	reset(): void {
		this.failedProxies.clear()
		this.currentIndex = 0
	}
}

export class RateLimitGuard {
	private maxRetries: number
	private baseDelayMs: number
	private maxDelayMs: number
	private circuitThreshold: number
	private circuitResetTimeoutMs: number

	private proxySwitcher: ProxySwitcher | null = null

	private consecutiveFailures = 0
	private circuitState: 'closed' | 'open' | 'half-open' = 'closed'
	private circuitOpenedAt = 0

	private totalBlocked = 0
	private totalRetries = 0

	constructor(
		private logger: ILogger,
		options: RateLimitGuardOptions = {}
	) {
		this.maxRetries = options.maxRetries ?? 5
		this.baseDelayMs = options.baseDelayMs ?? 1000
		this.maxDelayMs = options.maxDelayMs ?? 30000
		this.circuitThreshold = options.circuitThreshold ?? 5
		this.circuitResetTimeoutMs = options.circuitResetTimeoutMs ?? 60000

		if (options.proxyOptions && options.proxyOptions.proxies.length > 0) {
			this.proxySwitcher = new ProxySwitcher(options.proxyOptions)
		}
	}

	calculateBackoff(attempt: number): number {
		const exponential = Math.pow(2, attempt) * this.baseDelayMs
		const bounded = Math.min(exponential, this.maxDelayMs)
		const jitter = Math.floor(Math.random() * (bounded * 0.5))
		return bounded + jitter
	}

	async executeWithRetry<T>(fn: () => Promise<T>, opName = 'protocol-operation'): Promise<T> {
		this.checkCircuitState()

		if (this.circuitState === 'open') {
			this.totalBlocked += 1
			throw new Error(`RateLimitGuard: Circuit open for ${opName}. Request blocked to prevent ban.`)
		}

		let attempt = 0
		while (attempt <= this.maxRetries) {
			try {
				const result = await fn()
				this.onSuccess()
				return result
			} catch (err) {
				if (!isRateLimitError(err)) {
					throw err
				}

				this.onRateLimit(err)
				attempt += 1

				if (attempt > this.maxRetries) {
					this.logger.error({ opName, retries: attempt }, 'Rate limit retries exhausted')
					throw err
				}

				this.totalRetries += 1
				const delay = this.calculateBackoff(attempt)
				const activeProxy = this.proxySwitcher?.getNextProxy()

				this.logger.warn(
					{ opName, attempt, delayMs: delay, proxy: activeProxy?.url },
					'429 Rate Limit encountered. Retrying with adaptive backoff...'
				)

				await new Promise(resolve => setTimeout(resolve, delay))
			}
		}

		throw new Error(`RateLimitGuard: Operation ${opName} failed after ${this.maxRetries} retries`)
	}

	private checkCircuitState(): void {
		if (this.circuitState === 'open') {
			if (Date.now() - this.circuitOpenedAt > this.circuitResetTimeoutMs) {
				this.circuitState = 'half-open'
				this.logger.info('RateLimitGuard: Circuit entering half-open state, testing stability')
			}
		}
	}

	private onSuccess(): void {
		this.consecutiveFailures = 0
		if (this.circuitState === 'half-open') {
			this.circuitState = 'closed'
			this.logger.info('RateLimitGuard: Circuit closed successfully after stable response')
		}
	}

	private onRateLimit(err: unknown): void {
		this.consecutiveFailures += 1
		if (this.proxySwitcher) {
			const active = this.proxySwitcher.getNextProxy()
			if (active) {
				this.proxySwitcher.markProxyFailed(active.url)
			}
		}

		if (this.consecutiveFailures >= this.circuitThreshold) {
			this.circuitState = 'open'
			this.circuitOpenedAt = Date.now()
			this.logger.error(
				{ failures: this.consecutiveFailures, err: String(err) },
				'RateLimitGuard: Circuit TRIPPED OPEN. Blocking traffic to shield account.'
			)
		}
	}

	getStats(): RateLimitGuardStats {
		const active = this.proxySwitcher?.getNextProxy()
		return {
			totalBlocked: this.totalBlocked,
			totalRetries: this.totalRetries,
			activeProxyUrl: active ? active.url : null,
			circuitState: this.circuitState
		}
	}
}
