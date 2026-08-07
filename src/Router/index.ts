import type { WASocket } from '../index'
import type {
	AnyMessageContent,
	MessageUpsertType,
	MiscMessageGenerationOptions,
	WAMessage,
	WAMessageKey
} from '../Types'

export interface CommandContext {
	sock: WASocket
	msg: WAMessage
	key: WAMessageKey
	from: string
	sender: string
	body: string
	isGroup: boolean
	matches?: RegExpMatchArray
	reply: (content: string | AnyMessageContent, options?: MiscMessageGenerationOptions) => Promise<WAMessage | undefined>
	react: (emoji: string) => Promise<WAMessage | undefined>
	aiPrompt?: (promptText?: string, options?: any) => Promise<string>
	generateAIResponse?: (promptText?: string, options?: any) => Promise<WAMessage | undefined>
}

export type MiddlewareHandler = (ctx: CommandContext, next: () => Promise<void>) => Promise<void> | void
export type CommandPattern = string | RegExp

export class CommandRouter {
	private middlewares: MiddlewareHandler[] = []
	private commandHandlers: { pattern: CommandPattern; handler: MiddlewareHandler }[] = []

	constructor(private sock: WASocket) {}

	use(middleware: MiddlewareHandler): this {
		this.middlewares.push(middleware)
		return this
	}

	cmd(pattern: CommandPattern, handler: MiddlewareHandler): this {
		this.commandHandlers.push({ pattern, handler })
		return this
	}

	async handleMessage(msg: WAMessage): Promise<void> {
		const from = msg.key.remoteJid
		if (!from || !msg.message) {
			return
		}

		const body =
			msg.message.conversation ||
			msg.message.extendedTextMessage?.text ||
			msg.message.imageMessage?.caption ||
			msg.message.videoMessage?.caption ||
			''

		const isGroup = from.endsWith('@g.us')
		const sender = isGroup ? msg.key.participant || from : from

		const ctx: CommandContext = {
			sock: this.sock,
			msg,
			key: msg.key,
			from,
			sender,
			body,
			isGroup,
			reply: async (content, options) => {
				const payload: AnyMessageContent = typeof content === 'string' ? { text: content } : content
				return this.sock.sendMessage(from, payload, { quoted: msg, ...options })
			},
			react: async (emoji: string) => {
				return this.sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
			}
		}

		let index = 0
		const next = async (): Promise<void> => {
			if (index < this.middlewares.length) {
				const mw = this.middlewares[index++]
				if (mw) {
					await mw(ctx, next)
				}
			} else {
				for (const { pattern, handler } of this.commandHandlers) {
					let isMatch = false
					if (typeof pattern === 'string') {
						isMatch = body.trim().startsWith(pattern)
					} else if (pattern instanceof RegExp) {
						const match = body.match(pattern)
						if (match) {
							isMatch = true
							ctx.matches = match
						}
					}

					if (isMatch) {
						await handler(ctx, async () => {})
						break
					}
				}
			}
		}

		await next()
	}

	bind(): void {
		this.sock.ev.on(
			'messages.upsert',
			async ({ messages, type }: { messages: WAMessage[]; type: MessageUpsertType }) => {
				if (type !== 'notify') {
					return
				}

				for (const msg of messages) {
					if (!msg.key.fromMe) {
						await this.handleMessage(msg)
					}
				}
			}
		)
	}
}

export const createCommandRouter = (sock: WASocket): CommandRouter => {
	return new CommandRouter(sock)
}
