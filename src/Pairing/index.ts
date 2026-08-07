import type { Server } from 'http'
import { type RemoteRelayConfig, type RemoteRelayResult, sendRemotePairingRelay } from './remote-relay'
import { printPairingCodeCard } from './terminal-ui'
import { type PhoneValidationResult, validatePhoneNumber } from './validator'
import { startWebPairingPortal } from './web-server'

export interface PairingEngineConfig {
	enabled?: boolean
	phoneNumber?: string
	uiMode?: 'terminal' | 'web' | 'web_and_terminal'
	webDashboardPort?: number
	showCountdownTimer?: boolean
	validateNumberFirst?: boolean
	autoFallbackToQR?: boolean
	maxRetryAttempts?: number
	remoteRelay?: RemoteRelayConfig
}

export class PairingEngine {
	private webServer?: Server

	constructor(private config: PairingEngineConfig = {}) {}

	validateNumber(phone: string): PhoneValidationResult {
		return validatePhoneNumber(phone)
	}

	displayTerminalCode(code: string, phone?: string): void {
		printPairingCodeCard(code, phone || this.config.phoneNumber)
	}

	async relayCode(code: string, phone?: string): Promise<RemoteRelayResult> {
		if (!this.config.remoteRelay) {
			return { telegramSent: false, webhookSent: false, errors: [] }
		}

		return sendRemotePairingRelay(code, phone || this.config.phoneNumber || '', this.config.remoteRelay)
	}

	startWebDashboard(onRequestCode: (phone: string) => Promise<string>): Server {
		if (this.webServer) {
			return this.webServer
		}

		this.webServer = startWebPairingPortal({
			port: this.config.webDashboardPort || 3000,
			onRequestPairingCode: onRequestCode
		})

		return this.webServer
	}

	stopWebDashboard(): void {
		if (this.webServer) {
			this.webServer.close()
			this.webServer = undefined
		}
	}
}

export * from './remote-relay'
export * from './terminal-ui'
export * from './validator'
export * from './web-server'
