import { HumanEngine, type HumanEngineOptions } from './HumanEngine/index'
import { PairingEngine, type PairingEngineConfig } from './Pairing/index'
import { ResilienceEngine, type ResilienceEngineOptions } from './Resilience/index'
import makeWASocket from './Socket/index'
import type { SocketConfig } from './Types/Socket'
import type { MultiStoreAuthOptions } from './Utils/multi-store-auth'

export interface HNESocketConfig extends Partial<SocketConfig> {
	pairingEngine?: PairingEngineConfig
	stability?: {
		keepAliveIntervalMs?: number
		staleTimeoutMs?: number
		maxReconnectRetries?: number
		autoHealSession?: boolean
	}
	humanEngine?: HumanEngineOptions
	resilienceOptions?: ResilienceEngineOptions
	authStore?: MultiStoreAuthOptions
}

/**
 * Creates an HNE-enabled WASocket with Next-Gen Pairing Engine,
 * Human Natural Engine, Resilience Engine, and Security Vault capabilities.
 */
export function makeHNESocket(config: HNESocketConfig = {}) {
	const sock = makeWASocket(config as SocketConfig)

	const pairingEngine = new PairingEngine(config.pairingEngine)
	const humanEngine = new HumanEngine(config.humanEngine)
	const resilienceEngine = new ResilienceEngine(config.logger || sock.logger, config.resilienceOptions)

	sock.ev.on('connection.update', update => {
		resilienceEngine.sessionRevival.handleConnectionUpdate(update).catch(err => {
			sock.logger.error({ err }, 'Error handling connection update in ResilienceEngine')
		})
	})

	return Object.assign(sock, {
		pairingEngine,
		humanEngine,
		resilienceEngine,
		sendHumanMessage: async (
			jid: string,
			content: Parameters<typeof humanEngine.sendHumanMessage>[2],
			options?: Parameters<typeof humanEngine.sendHumanMessage>[3]
		) => {
			return humanEngine.sendHumanMessage(sock, jid, content, options)
		}
	})
}

export type HNESocket = ReturnType<typeof makeHNESocket>
export default makeHNESocket
