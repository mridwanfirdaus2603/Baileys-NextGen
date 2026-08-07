import { jest } from '@jest/globals'
import { AIAgentBridge, createAIAgentMiddleware } from '../../AI'
import type { WASocket } from '../../index'
import { createCommandRouter } from '../../Router'
import type { WAMessage } from '../../Types'
import { makeEventBuffer } from '../../Utils/event-buffer'
import logger from '../../Utils/logger'

describe('AI Agent & Antigravity Framework Integration Unit Tests', () => {
	let originalFetch: typeof fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it('throws error if no API key is provided', async () => {
		const oldEnvKey = process.env.GEMINI_API_KEY
		delete process.env.GEMINI_API_KEY
		try {
			const bridge = new AIAgentBridge({ apiKey: '' })
			await expect(bridge.generateText('hello')).rejects.toThrow('Gemini API key is required')
		} finally {
			if (oldEnvKey) {
				process.env.GEMINI_API_KEY = oldEnvKey
			}
		}
	})

	it('generates text using mocked fetch API', async () => {
		const mockResponse = {
			candidates: [
				{
					content: {
						parts: [{ text: 'Halo! Saya AI Assistant.' }]
					}
				}
			]
		}

		globalThis.fetch = (async () => {
			return {
				ok: true,
				status: 200,
				json: async () => mockResponse,
				text: async () => JSON.stringify(mockResponse)
			} as Response
		}) as typeof fetch

		const bridge = new AIAgentBridge({ apiKey: 'mock-key-123', model: 'gemini-2.5-flash' })
		const result = await bridge.generateText('Siapa kamu?')

		expect(result.text).toBe('Halo! Saya AI Assistant.')
	})

	it('integrates AI middleware with CommandRouter and ctx.generateAIResponse', async () => {
		const sentMessages: { jid: string; content: unknown }[] = []
		const ev = makeEventBuffer(logger)
		const mockSock = {
			sendMessage: jest.fn(async (jid: string, content: unknown) => {
				sentMessages.push({ jid, content })
				return undefined
			}) as any,
			ev
		}

		globalThis.fetch = (async () => {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [{ content: { parts: [{ text: 'AI response text' }] } }]
				}),
				text: async () => ''
			} as Response
		}) as typeof fetch

		const router = createCommandRouter(mockSock as WASocket)
		router.use(createAIAgentMiddleware({ apiKey: 'test-key' }))

		router.cmd('!ai', async ctx => {
			await ctx.generateAIResponse?.('Beri saya ucapan')
		})

		const mockMsg: WAMessage = {
			key: { remoteJid: '1234567890@s.whatsapp.net', id: 'M-AI-1', fromMe: false },
			message: { conversation: '!ai Beri saya ucapan' }
		}

		await router.handleMessage(mockMsg)

		expect(sentMessages.length).toBe(1)
		expect(sentMessages[0]?.content).toEqual({ text: 'AI response text' })
	})
})
