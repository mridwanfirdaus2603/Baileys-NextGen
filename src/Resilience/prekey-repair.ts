import type { SignalKeyStore } from '../Types/Auth'
import type { ILogger } from '../Utils/logger'

export interface PreKeyRepairOptions {
	maxRepairAttemptsPerJid?: number
	repairWindowMs?: number
}

export interface PreKeyRepairStats {
	totalRepairs: number
	repairedJids: string[]
	activeSessionsPurged: number
}

export function isBadMacError(err: unknown): boolean {
	if (!err) return false
	const msg =
		typeof err === 'object' && err !== null && 'message' in err
			? String((err as { message: unknown }).message)
			: String(err)

	const lower = msg.toLowerCase()
	return (
		lower.includes('bad mac') ||
		lower.includes('mac error') ||
		lower.includes('invalid mac') ||
		lower.includes('signalerrorbadmac') ||
		lower.includes('no session record') ||
		lower.includes('session record not found')
	)
}

export class PreKeyRepairEngine {
	private repairAttempts = new Map<string, { count: number; lastAttempt: number }>()
	private repairedJidSet = new Set<string>()
	private totalRepairs = 0
	private activeSessionsPurged = 0

	private maxAttempts: number
	private windowMs: number

	constructor(
		private logger: ILogger,
		options: PreKeyRepairOptions = {}
	) {
		this.maxAttempts = options.maxRepairAttemptsPerJid ?? 3
		this.windowMs = options.repairWindowMs ?? 10 * 60 * 1000
	}

	async repairSession(jid: string, err: unknown, keys: SignalKeyStore): Promise<boolean> {
		const now = Date.now()
		const record = this.repairAttempts.get(jid)

		if (record && now - record.lastAttempt < this.windowMs) {
			if (record.count >= this.maxAttempts) {
				this.logger.warn({ jid, attempts: record.count }, 'Max repair attempts reached for JID, throttling repair')
				return false
			}

			record.count += 1
			record.lastAttempt = now
		} else {
			this.repairAttempts.set(jid, { count: 1, lastAttempt: now })
		}

		this.logger.warn(
			{ jid, err: String(err) },
			'Bad MAC / Session Desync detected. Initiating automatic PreKey repair...'
		)

		try {
			const sessionKey = `session-${jid}`
			await keys.set({ session: { [jid]: null } })
			this.activeSessionsPurged += 1
			this.totalRepairs += 1
			this.repairedJidSet.add(jid)

			this.logger.info(
				{ jid, sessionKey },
				'Corrupted Signal session purged successfully. Ready for fresh PreKey exchange.'
			)
			return true
		} catch (purgeErr) {
			this.logger.error({ jid, err: purgeErr }, 'Failed to purge corrupted session key during repair')
			return false
		}
	}

	getStats(): PreKeyRepairStats {
		return {
			totalRepairs: this.totalRepairs,
			repairedJids: Array.from(this.repairedJidSet),
			activeSessionsPurged: this.activeSessionsPurged
		}
	}

	clear(): void {
		this.repairAttempts.clear()
		this.repairedJidSet.clear()
		this.totalRepairs = 0
		this.activeSessionsPurged = 0
	}
}
