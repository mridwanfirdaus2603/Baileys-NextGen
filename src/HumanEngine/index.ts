import type { WASocket } from '../index'
import type { AnyMessageContent, MiscMessageGenerationOptions, WAMessage } from '../Types'
import { delay } from '../Utils/generics'

export interface HumanEngineOptions {
	enabled?: boolean
	typingSpeedWPM?: number
	randomDelayJitterRangeMs?: [number, number]
}

export class HumanEngine {
	private typingSpeedWPM: number
	private jitterRange: [number, number]

	constructor(options: HumanEngineOptions = {}) {
		this.typingSpeedWPM = options.typingSpeedWPM ?? 45
		this.jitterRange = options.randomDelayJitterRangeMs ?? [1000, 3000]
	}

	calculateTypingDelay(text: string): number {
		const words = text.trim().split(/\s+/).filter(Boolean).length || 1
		const baseDelayMs = (words / this.typingSpeedWPM) * 60 * 1000

		const [minJitter, maxJitter] = this.jitterRange
		const jitterMs = Math.floor(Math.random() * (maxJitter - minJitter + 1)) + minJitter

		return Math.min(Math.floor(baseDelayMs + jitterMs), 15000)
	}

	async sendHumanMessage(
		sock: WASocket,
		jid: string,
		content: AnyMessageContent,
		options?: MiscMessageGenerationOptions
	): Promise<WAMessage | undefined> {
		const text =
			typeof content === 'string' ? content : 'text' in content && typeof content.text === 'string' ? content.text : ''

		if (text && sock.sendPresenceUpdate) {
			await sock.sendPresenceUpdate('composing', jid).catch(() => {})
			const delayMs = this.calculateTypingDelay(text)
			await delay(delayMs)
			await sock.sendPresenceUpdate('paused', jid).catch(() => {})
		}

		return sock.sendMessage(jid, content, options)
	}
}

export const createHumanEngine = (options?: HumanEngineOptions): HumanEngine => {
	return new HumanEngine(options)
}
