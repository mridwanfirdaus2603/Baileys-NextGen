import { jest } from '@jest/globals'
import type { WASocket } from '../../index'
import { CommandRouter, createCommandRouter } from '../../Router'
import type { WAMessage } from '../../Types'
import { makeEventBuffer } from '../../Utils/event-buffer'
import logger from '../../Utils/logger'

describe('Express-like Command Router Unit Tests', () => {
	let mockSock: Partial<WASocket>
	let sentMessages: { jid: string; content: unknown; options?: unknown }[]

	beforeEach(() => {
		sentMessages = []
		const ev = makeEventBuffer(logger)
		mockSock = {
			sendMessage: jest.fn(async (jid: string, content: unknown, options?: unknown) => {
				sentMessages.push({ jid, content, options })
				return undefined
			}) as any,
			ev
		}
	})

	it('executes string prefix command handler and ctx.reply', async () => {
		const router = createCommandRouter(mockSock as WASocket)
		let executed = false

		router.cmd('!ping', async ctx => {
			executed = true
			await ctx.reply('pong!')
		})

		const mockMsg: WAMessage = {
			key: { remoteJid: '1234567890@s.whatsapp.net', id: 'M1', fromMe: false },
			message: { conversation: '!ping' }
		}

		await router.handleMessage(mockMsg)

		expect(executed).toBe(true)
		expect(sentMessages.length).toBe(1)
		expect(sentMessages[0]?.content).toEqual({ text: 'pong!' })
	})

	it('executes RegExp command handler with matches and ctx.react', async () => {
		const router = new CommandRouter(mockSock as WASocket)
		let capturedName = ''

		router.cmd(/^!hello\s+(.+)$/i, async ctx => {
			capturedName = ctx.matches?.[1] || ''
			await ctx.react('👍')
		})

		const mockMsg: WAMessage = {
			key: { remoteJid: '1234567890@s.whatsapp.net', id: 'M2', fromMe: false },
			message: { conversation: '!hello Ridwan' }
		}

		await router.handleMessage(mockMsg)

		expect(capturedName).toBe('Ridwan')
		expect(sentMessages.length).toBe(1)
		expect(sentMessages[0]?.content).toEqual({ react: { text: '👍', key: mockMsg.key } })
	})

	it('passes execution through middleware chain before command handler', async () => {
		const router = createCommandRouter(mockSock as WASocket)
		const log: string[] = []

		router.use(async (ctx, next) => {
			log.push('middleware-start')
			await next()
			log.push('middleware-end')
		})

		router.cmd('!test', async () => {
			log.push('command-handler')
		})

		const mockMsg: WAMessage = {
			key: { remoteJid: '1234567890@s.whatsapp.net', id: 'M3', fromMe: false },
			message: { conversation: '!test' }
		}

		await router.handleMessage(mockMsg)

		expect(log).toEqual(['middleware-start', 'command-handler', 'middleware-end'])
	})
})
