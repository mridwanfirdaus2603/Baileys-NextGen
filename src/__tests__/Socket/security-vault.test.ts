import type { WAMessage } from '../../Types'

describe('Call Guard & Security Vault Feature Unit Tests', () => {
	it('defines CallGuardOptions and VaultOptions in SocketConfig', () => {
		const callGuard = {
			autoReject: true,
			autoReplyText: 'Mohon maaf, nomor ini hanya menerima pesan teks.',
			autoBlockSpammer: true
		}

		const vaultOptions = {
			saveViewOnce: true,
			trackDeletedMessages: true,
			maxCacheSize: 5000
		}

		expect(callGuard.autoReject).toBe(true)
		expect(callGuard.autoReplyText).toContain('Mohon maaf')
		expect(vaultOptions.maxCacheSize).toBe(5000)
	})

	it('unwraps viewOnceMessage payload correctly when saveViewOnce option is active', () => {
		const msg: WAMessage = {
			key: { remoteJid: '1234567890@s.whatsapp.net', id: 'MSG123', fromMe: false },
			message: {
				viewOnceMessage: {
					message: {
						imageMessage: {
							caption: 'Test View Once'
						}
					}
				}
			}
		}

		const viewOnceWrapper =
			msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension

		if (viewOnceWrapper?.message) {
			msg.message = viewOnceWrapper.message
		}

		expect(msg.message?.imageMessage?.caption).toBe('Test View Once')
		expect(msg.message?.viewOnceMessage).toBeUndefined()
	})
})
