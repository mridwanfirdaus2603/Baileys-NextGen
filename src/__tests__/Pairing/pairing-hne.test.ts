import { jest } from '@jest/globals'
import makeHNESocket from '../../hne-core'
import { HumanEngine } from '../../HumanEngine'
import type { WASocket } from '../../index'
import {
	formatPairingCodeCard,
	PairingEngine,
	sendRemotePairingRelay,
	startWebPairingPortal,
	validatePhoneNumber
} from '../../Pairing'
import { makeEventBuffer } from '../../Utils/event-buffer'
import logger from '../../Utils/logger'
import { useMultiStoreAuthState } from '../../Utils/multi-store-auth'

describe('Next-Gen Pairing Engine (HNE) Unit Tests', () => {
	let originalFetch: typeof fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	describe('Phone Number Pre-Validator', () => {
		it('validates correct E.164 phone numbers and detects country code', () => {
			const res = validatePhoneNumber('6281234567890')
			expect(res.isValid).toBe(true)
			expect(res.formatted).toBe('6281234567890')
			expect(res.countryCode).toBe('ID')
		})

		it('rejects short or invalid phone numbers', () => {
			const res = validatePhoneNumber('123')
			expect(res.isValid).toBe(false)
			expect(res.error).toBeDefined()
		})
	})

	describe('Terminal UI Generator', () => {
		it('formats pairing code card string properly', () => {
			const card = formatPairingCodeCard('ABCD1234', '6281234567890')
			expect(card).toContain('NEXT-GEN PAIRING ENGINE')
			expect(card).toContain('ABCD-1234')
			expect(card).toContain('6281234567890')
		})
	})

	describe('Remote Relay (Telegram & Webhook)', () => {
		it('relays pairing code to Telegram and Webhook via fetch', async () => {
			let fetchCalls = 0
			globalThis.fetch = (async () => {
				fetchCalls++
				return {
					ok: true,
					status: 200,
					text: async () => 'OK'
				} as Response
			}) as typeof fetch

			const res = await sendRemotePairingRelay('ABCD1234', '6281234567890', {
				telegramBotToken: '123:ABC',
				telegramChatId: '999',
				webhookUrl: 'https://api.test/relay'
			})

			expect(res.telegramSent).toBe(true)
			expect(res.webhookSent).toBe(true)
			expect(fetchCalls).toBe(2)
		})
	})

	describe('Live Web Pairing Portal Server', () => {
		it('starts HTTP server and handles pairing API request', async () => {
			const server = startWebPairingPortal({
				port: 0, // Random available port
				onRequestPairingCode: async (phone: string) => `CODE-${phone}`
			})

			await new Promise(resolve => setTimeout(resolve, 100))
			const address = server.address()
			const port = typeof address === 'object' && address ? address.port : 3000

			// Test GET /
			const resHtml = await fetch(`http://localhost:${port}/`)
			expect(resHtml.status).toBe(200)
			const htmlText = await resHtml.text()
			expect(htmlText).toContain('Next-Gen Pairing Portal')

			// Test POST /api/pair
			const resPair = await fetch(`http://localhost:${port}/api/pair`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: '628123' })
			})

			const data = (await resPair.json()) as { code: string }
			expect(data.code).toBe('CODE-628123')

			server.close()
		})
	})

	describe('Human Natural Engine (Anti-Ban & Presence)', () => {
		it('calculates typing delay based on WPM and jitter', () => {
			const engine = new HumanEngine({ typingSpeedWPM: 60, randomDelayJitterRangeMs: [500, 500] })
			// 60 WPM = 1 word per sec = 1000ms base delay + 500ms jitter = 1500ms
			const delayMs = engine.calculateTypingDelay('hello world')
			expect(delayMs).toBeGreaterThanOrEqual(1500)
		})

		it('simulates typing presence and sends message', async () => {
			const presenceUpdates: string[] = []
			const sentMessages: unknown[] = []

			const ev = makeEventBuffer(logger)
			const mockSock = {
				sendPresenceUpdate: jest.fn(async (state: string, jid: string) => {
					presenceUpdates.push(`${state}:${jid}`)
				}),
				sendMessage: jest.fn(async (jid: string, content: unknown) => {
					sentMessages.push(content)
					return undefined
				}),
				ev
			} as unknown as WASocket

			const engine = new HumanEngine({ typingSpeedWPM: 600, randomDelayJitterRangeMs: [10, 20] })
			await engine.sendHumanMessage(mockSock, '123@s.whatsapp.net', { text: 'Halo!' })

			expect(presenceUpdates).toEqual(['composing:123@s.whatsapp.net', 'paused:123@s.whatsapp.net'])
			expect(sentMessages.length).toBe(1)
		})
	})

	describe('makeHNESocket Integration', () => {
		it('instantiates HNE socket with PairingEngine and HumanEngine', async () => {
			const auth = await useMultiStoreAuthState({ driver: 'memory' })
			const hneSock = makeHNESocket({
				auth: auth.state,
				pairingEngine: { enabled: true, phoneNumber: '628123' },
				humanEngine: { enabled: true }
			})

			expect(hneSock.pairingEngine).toBeInstanceOf(PairingEngine)
			expect(hneSock.humanEngine).toBeInstanceOf(HumanEngine)
		})
	})
})
