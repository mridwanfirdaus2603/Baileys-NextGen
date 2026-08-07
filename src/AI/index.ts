import { Boom } from '@hapi/boom'
import type { CommandContext, MiddlewareHandler } from '../Router'
import type { WAMessage } from '../Types'

export interface AIAgentOptions {
	apiKey?: string
	model?: string
	systemInstruction?: string
	temperature?: number
	maxOutputTokens?: number
	apiEndpoint?: string
}

export interface AIGenerateResult {
	text: string
	raw?: unknown
}

export class AIAgentBridge {
	private apiKey: string
	private model: string
	private systemInstruction?: string
	private temperature: number
	private maxOutputTokens?: number
	private apiEndpoint?: string

	constructor(options: AIAgentOptions = {}) {
		this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || ''
		this.model = options.model || 'gemini-2.5-flash'
		this.systemInstruction = options.systemInstruction
		this.temperature = options.temperature ?? 0.7
		this.maxOutputTokens = options.maxOutputTokens
		this.apiEndpoint = options.apiEndpoint
	}

	async generateText(prompt: string, customOptions?: AIAgentOptions): Promise<AIGenerateResult> {
		const apiKey = customOptions?.apiKey || this.apiKey
		const model = customOptions?.model || this.model
		const systemInstruction = customOptions?.systemInstruction || this.systemInstruction
		const temperature = customOptions?.temperature ?? this.temperature
		const maxOutputTokens = customOptions?.maxOutputTokens || this.maxOutputTokens

		if (!apiKey) {
			throw new Boom('Gemini API key is required. Set GEMINI_API_KEY env variable or pass apiKey in AIAgentOptions.', {
				statusCode: 401
			})
		}

		const endpoint =
			customOptions?.apiEndpoint ||
			this.apiEndpoint ||
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

		const payload: Record<string, unknown> = {
			contents: [
				{
					role: 'user',
					parts: [{ text: prompt }]
				}
			],
			generationConfig: {
				temperature,
				...(maxOutputTokens ? { maxOutputTokens } : {})
			}
		}

		if (systemInstruction) {
			payload.systemInstruction = {
				parts: [{ text: systemInstruction }]
			}
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		})

		if (!response.ok) {
			const errText = await response.text().catch(() => '')
			throw new Boom(`AI API Error (${response.status}): ${errText}`, {
				statusCode: response.status >= 400 && response.status < 600 ? response.status : 500
			})
		}

		const data = (await response.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[]
		}

		const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
		return {
			text: responseText,
			raw: data
		}
	}
}

export const createAIAgentBridge = (options?: AIAgentOptions): AIAgentBridge => {
	return new AIAgentBridge(options)
}

export const createAIAgentMiddleware = (defaultOptions?: AIAgentOptions): MiddlewareHandler => {
	const bridge = new AIAgentBridge(defaultOptions)

	return async (ctx: CommandContext, next: () => Promise<void>) => {
		ctx.aiPrompt = async (promptText?: string, options?: AIAgentOptions): Promise<string> => {
			const prompt = promptText || ctx.body
			const result = await bridge.generateText(prompt, options)
			return result.text
		}

		ctx.generateAIResponse = async (promptText?: string, options?: AIAgentOptions): Promise<WAMessage | undefined> => {
			const text = await ctx.aiPrompt!(promptText, options)
			return ctx.reply(text)
		}

		await next()
	}
}
