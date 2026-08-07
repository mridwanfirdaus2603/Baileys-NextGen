import type { SignalKeyStore } from '../Types/Auth'
import type { BaileysEventMap } from '../Types/Events'
import type { ILogger } from '../Utils/logger'

export interface SessionRevivalOptions {
	autoRePairOn401?: boolean
	maxAutoReconnects?: number
	healthCheckIntervalMs?: number
	onSessionDead?: (reason: string) => void
	onTriggerRePair?: () => Promise<void>
}

export interface SessionRevivalStats {
	totalReconnects: number
	totalRePairs: number
	lastDisconnectReason: string | null
	healthStatus: 'healthy' | 'warning' | 'degraded' | 'dead'
}

export class SessionRevivalEngine {
	private totalReconnects = 0
	private totalRePairs = 0
	private lastDisconnectReason: string | null = null
	private healthStatus: 'healthy' | 'warning' | 'degraded' | 'dead' = 'healthy'

	private autoRePairOn401: boolean
	private maxAutoReconnects: number

	constructor(
		private logger: ILogger,
		private options: SessionRevivalOptions = {}
	) {
		this.autoRePairOn401 = options.autoRePairOn401 ?? true
		this.maxAutoReconnects = options.maxAutoReconnects ?? 10
	}

	async handleConnectionUpdate(update: Partial<BaileysEventMap['connection.update']>): Promise<void> {
		const { connection, lastDisconnect } = update

		if (connection === 'close') {
			const error = lastDisconnect?.error
			const statusCode =
				typeof error === 'object' && error !== null && 'output' in error
					? (error as { output?: { statusCode?: number } }).output?.statusCode
					: undefined

			const reasonMsg = error?.message ?? `Status code ${statusCode}`
			this.lastDisconnectReason = reasonMsg

			this.logger.warn({ statusCode, err: error }, 'Session connection closed')

			if (statusCode === 401 || statusCode === 403) {
				this.healthStatus = 'dead'
				this.logger.error({ statusCode }, 'Session unauthenticated / logged out (401/403)')

				if (this.options.onSessionDead) {
					this.options.onSessionDead(reasonMsg)
				}

				if (this.autoRePairOn401 && this.options.onTriggerRePair) {
					this.totalRePairs += 1
					this.logger.info('Triggering automatic Re-Pairing flow...')
					await this.options.onTriggerRePair()
				}
			} else if (statusCode === 515 || statusCode === 428 || statusCode === 440) {
				this.healthStatus = 'degraded'
				this.totalReconnects += 1
				this.logger.info({ statusCode }, 'Transient connection drop detected. Auto-reconnecting session...')
			}
		} else if (connection === 'open') {
			this.healthStatus = 'healthy'
			this.logger.info('Session active and healthy')
		}
	}

	async checkPrekeyInventory(keys: SignalKeyStore): Promise<{ lowCount: boolean; remainingKeys?: number }> {
		try {
			// SignalKeyStore key retrieval check
			const preKeys = await keys.get('pre-key', ['1', '2', '3', '4', '5'])
			const keyCount = Object.keys(preKeys || {}).length

			if (keyCount < 3) {
				this.healthStatus = 'warning'
				this.logger.warn({ keyCount }, 'PreKey inventory running critically low!')
				return { lowCount: true, remainingKeys: keyCount }
			}

			return { lowCount: false, remainingKeys: keyCount }
		} catch (err) {
			this.logger.error({ err }, 'Failed to check PreKey inventory count')
			return { lowCount: true }
		}
	}

	getStats(): SessionRevivalStats {
		return {
			totalReconnects: this.totalReconnects,
			totalRePairs: this.totalRePairs,
			lastDisconnectReason: this.lastDisconnectReason,
			healthStatus: this.healthStatus
		}
	}
}
