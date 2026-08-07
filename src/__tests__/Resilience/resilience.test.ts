import { describe, expect, it, jest } from '@jest/globals'
import P from 'pino'
import makeHNESocket from '../../hne-core'
import {
	createResilienceEngine,
	isBadMacError,
	isRateLimitError,
	PreKeyRepairEngine,
	ProxySwitcher,
	RateLimitGuard,
	ResilienceEngine,
	SessionRevivalEngine
} from '../../Resilience/index'
import type { SignalKeyStore } from '../../Types/Auth'
import { useMultiStoreAuthState } from '../../Utils/multi-store-auth'

const logger = P({ level: 'silent' })

describe('Resilience Engine Module', () => {
	describe('PreKeyRepairEngine', () => {
		it('should detect Bad MAC errors correctly', () => {
			expect(isBadMacError(new Error('SignalErrorBadMac: MAC check failed'))).toBe(true)
			expect(isBadMacError(new Error('Bad MAC in message decryption'))).toBe(true)
			expect(isBadMacError(new Error('no session record found for sender'))).toBe(true)
			expect(isBadMacError(new Error('Normal network timeout'))).toBe(false)
		})

		it('should purge corrupted session key when repairSession is called', async () => {
			const mockSet = jest.fn()
			const mockKeys = { set: mockSet } as unknown as SignalKeyStore

			const repairEngine = new PreKeyRepairEngine(logger)
			const success = async () =>
				repairEngine.repairSession('628123456789@s.whatsapp.net', new Error('Bad MAC'), mockKeys)

			const repaired = await success()
			expect(repaired).toBe(true)
			expect(mockSet).toHaveBeenCalledWith({ session: { '628123456789@s.whatsapp.net': null } })

			const stats = repairEngine.getStats()
			expect(stats.totalRepairs).toBe(1)
			expect(stats.repairedJids).toContain('628123456789@s.whatsapp.net')
		})

		it('should throttle max repair attempts per JID', async () => {
			const mockSet = jest.fn()
			const mockKeys = { set: mockSet } as unknown as SignalKeyStore

			const repairEngine = new PreKeyRepairEngine(logger, { maxRepairAttemptsPerJid: 2 })
			const jid = '62811111111@s.whatsapp.net'

			await repairEngine.repairSession(jid, new Error('Bad MAC'), mockKeys)
			await repairEngine.repairSession(jid, new Error('Bad MAC'), mockKeys)
			const third = await repairEngine.repairSession(jid, new Error('Bad MAC'), mockKeys)

			expect(third).toBe(false)
			expect(repairEngine.getStats().totalRepairs).toBe(2)
		})
	})

	describe('RateLimitGuard & ProxySwitcher', () => {
		it('should detect 429 rate limit errors', () => {
			expect(isRateLimitError(429)).toBe(true)
			expect(isRateLimitError({ output: { statusCode: 429 } })).toBe(true)
			expect(isRateLimitError(new Error('429 Too Many Requests'))).toBe(true)
			expect(isRateLimitError(new Error('Resource exhausted'))).toBe(true)
			expect(isRateLimitError(new Error('Internal Server Error 500'))).toBe(false)
		})

		it('should calculate adaptive backoff with jitter', () => {
			const guard = new RateLimitGuard(logger, { baseDelayMs: 100, maxDelayMs: 1000 })
			const delay1 = guard.calculateBackoff(1)
			expect(delay1).toBeGreaterThanOrEqual(200)
			expect(delay1).toBeLessThanOrEqual(300)
		})

		it('should switch proxies using ProxySwitcher in round-robin mode', () => {
			const switcher = new ProxySwitcher({
				proxies: [
					{ url: 'http://proxy1:8080', protocol: 'http' },
					{ url: 'http://proxy2:8080', protocol: 'http' }
				],
				strategy: 'round-robin'
			})

			const p1 = switcher.getNextProxy()
			const p2 = switcher.getNextProxy()

			expect(p1?.url).toBe('http://proxy1:8080')
			expect(p2?.url).toBe('http://proxy2:8080')
		})

		it('should trip circuit breaker when consecutive rate limit failures occur', async () => {
			const guard = new RateLimitGuard(logger, {
				maxRetries: 1,
				baseDelayMs: 1,
				circuitThreshold: 2
			})

			const failingFn = async () => {
				throw new Error('429 Too Many Requests')
			}

			await expect(guard.executeWithRetry(failingFn, 'test-op')).rejects.toThrow()
			await expect(guard.executeWithRetry(failingFn, 'test-op')).rejects.toThrow()

			const stats = guard.getStats()
			expect(stats.circuitState).toBe('open')

			// Blocked immediately when circuit is open
			await expect(guard.executeWithRetry(async () => 'ok', 'test-op')).rejects.toThrow(/Circuit open/)
		})
	})

	describe('SessionRevivalEngine', () => {
		it('should update health status and stats on connection closed update', async () => {
			const onDead = jest.fn()
			const onRePair = jest.fn<() => Promise<void>>().mockImplementation(async () => {})

			const revival = new SessionRevivalEngine(logger, {
				autoRePairOn401: true,
				onSessionDead: onDead,
				onTriggerRePair: onRePair
			})

			await revival.handleConnectionUpdate({
				connection: 'close',
				lastDisconnect: {
					error: { output: { statusCode: 401 } } as unknown as Error,
					date: new Date()
				}
			})

			expect(onDead).toHaveBeenCalled()
			expect(onRePair).toHaveBeenCalled()

			const stats = revival.getStats()
			expect(stats.healthStatus).toBe('dead')
			expect(stats.totalRePairs).toBe(1)
		})

		it('should check prekey inventory status', async () => {
			const mockGet = jest.fn(async () => ({ '1': {}, '2': {} }))
			const mockKeys = { get: mockGet } as unknown as SignalKeyStore

			const revival = new SessionRevivalEngine(logger)
			const result = await revival.checkPrekeyInventory(mockKeys)

			expect(result.lowCount).toBe(true)
			expect(result.remainingKeys).toBe(2)
		})
	})

	describe('ResilienceEngine & makeHNESocket integration', () => {
		it('should initialize ResilienceEngine with makeHNESocket and helper factory', async () => {
			const helperEngine = createResilienceEngine(logger)
			expect(helperEngine).toBeInstanceOf(ResilienceEngine)

			const { state } = await useMultiStoreAuthState({ driver: 'memory' })
			const sock = makeHNESocket({
				auth: state,
				logger
			})

			expect(sock.resilienceEngine).toBeInstanceOf(ResilienceEngine)
			const report = sock.resilienceEngine.getSystemHealthReport()
			expect(report.preKeyStats.totalRepairs).toBe(0)
			expect(report.sessionRevivalStats.healthStatus).toBe('healthy')
		})
	})
})
