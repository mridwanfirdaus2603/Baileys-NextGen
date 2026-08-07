export interface RemoteRelayConfig {
	telegramBotToken?: string
	telegramChatId?: string
	webhookUrl?: string
}

export interface RemoteRelayResult {
	telegramSent: boolean
	webhookSent: boolean
	errors: string[]
}

/**
 * Remote Pairing Relay (Telegram / Webhook)
 * Relays pairing code directly to Telegram Admin or Webhook when a session disconnects or requests pairing.
 */
export async function sendRemotePairingRelay(
	pairingCode: string,
	phoneNumber: string,
	config: RemoteRelayConfig
): Promise<RemoteRelayResult> {
	const errors: string[] = []
	let telegramSent = false
	let webhookSent = false

	if (config.telegramBotToken && config.telegramChatId) {
		try {
			const text = `🔐 *Baileys Next-Gen Pairing Code*\n\n📱 *Nomor*: \`${phoneNumber}\`\n🔑 *Kode Pairing*: \`${pairingCode}\`\n\n⏰ _Kode ini berlaku selama 60 detik._`
			const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`

			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: config.telegramChatId,
					text,
					parse_mode: 'Markdown'
				})
			})

			if (res.ok) {
				telegramSent = true
			} else {
				const errText = await res.text().catch(() => '')
				errors.push(`Telegram Relay Error (${res.status}): ${errText}`)
			}
		} catch (err: unknown) {
			errors.push(`Telegram Relay Exception: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	if (config.webhookUrl) {
		try {
			const res = await fetch(config.webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event: 'pairing_code_generated',
					phoneNumber,
					pairingCode,
					timestamp: new Date().toISOString()
				})
			})

			if (res.ok) {
				webhookSent = true
			} else {
				const errText = await res.text().catch(() => '')
				errors.push(`Webhook Relay Error (${res.status}): ${errText}`)
			}
		} catch (err: unknown) {
			errors.push(`Webhook Relay Exception: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	return {
		telegramSent,
		webhookSent,
		errors
	}
}
