/**
 * Interactive Terminal UI Generator
 * Render a styled terminal card with pairing code.
 */
export function formatPairingCodeCard(code: string, phoneNumber?: string): string {
	const formattedCode = code.match(/.{1,4}/g)?.join('-') || code
	const phoneStr = phoneNumber ? `📱  Phone: ${phoneNumber}` : '📱  Status: Pairing Ready'

	return `
==================================================
        ⚡ NEXT-GEN PAIRING ENGINE (HNE) ⚡
==================================================
 ${phoneStr}
 🔑  PAIRING CODE:  \x1b[1;\x1b[32m${formattedCode}\x1b[0m
 ⏰  Expires in:   60 Seconds
==================================================
 Instructions: Open WhatsApp > Linked Devices >
 Link with Phone Number > Enter Code above.
==================================================
`
}

export function printPairingCodeCard(code: string, phoneNumber?: string): void {
	console.log(formatPairingCodeCard(code, phoneNumber))
}
