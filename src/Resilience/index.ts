import type { SignalKeyStore } from '../Types/Auth'
import type { ILogger } from '../Utils/logger'
import { PreKeyRepairEngine, type PreKeyRepairOptions } from './prekey-repair'
import { RateLimitGuard, type RateLimitGuardOptions } from './rate-limit-guard'
import { SessionRevivalEngine, type SessionRevivalOptions } from './session-revival'

export * from './prekey-repair'
export * from './rate-limit-guard'
export * from './session-revival'

export interface ResilienceEngineOptions {
	preKeyOptions?: PreKeyRepairOptions
	rateLimitOptions?: RateLimitGuardOptions
	sessionRevivalOptions?: SessionRevivalOptions
}

export class ResilienceEngine {
	public preKeyRepair: PreKeyRepairEngine
	public rateLimitGuard: RateLimitGuard
	public sessionRevival: SessionRevivalEngine

	constructor(
		private logger: ILogger,
		options: ResilienceEngineOptions = {}
	) {
		this.preKeyRepair = new PreKeyRepairEngine(logger, options.preKeyOptions)
		this.rateLimitGuard = new RateLimitGuard(logger, options.rateLimitOptions)
		this.sessionRevival = new SessionRevivalEngine(logger, options.sessionRevivalOptions)
	}

	async handleDecryptionFailure(jid: string, err: unknown, keys: SignalKeyStore): Promise<boolean> {
		return this.preKeyRepair.repairSession(jid, err, keys)
	}

	async executeGuardedQuery<T>(fn: () => Promise<T>, opName?: string): Promise<T> {
		return this.rateLimitGuard.executeWithRetry(fn, opName)
	}

	getSystemHealthReport() {
		return {
			preKeyStats: this.preKeyRepair.getStats(),
			rateLimitStats: this.rateLimitGuard.getStats(),
			sessionRevivalStats: this.sessionRevival.getStats()
		}
	}
}

export function createResilienceEngine(logger: ILogger, options?: ResilienceEngineOptions): ResilienceEngine {
	return new ResilienceEngine(logger, options)
}
