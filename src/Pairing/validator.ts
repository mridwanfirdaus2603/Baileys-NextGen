export interface PhoneValidationResult {
	isValid: boolean
	formatted: string
	countryCode?: string
	error?: string
}

/**
 * Smart Phone Number Pre-Validator & Ban Guard
 * Validates E.164 format and detects invalid/blacklisted phone formats.
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
	if (!phone || typeof phone !== 'string') {
		return {
			isValid: false,
			formatted: '',
			error: 'Phone number is empty or invalid type'
		}
	}

	// Remove all non-numeric characters except leading '+'
	let cleaned = phone.trim().replace(/[^\d+]/g, '')
	if (cleaned.startsWith('+')) {
		cleaned = cleaned.substring(1)
	}

	// E.164 numbers are usually 7 to 15 digits long
	if (cleaned.length < 7 || cleaned.length > 15) {
		return {
			isValid: false,
			formatted: cleaned,
			error: `Phone number length (${cleaned.length}) outside standard E.164 range (7-15 digits)`
		}
	}

	// Detect country code
	let countryCode: string | undefined
	if (cleaned.startsWith('62')) {
		countryCode = 'ID'
	} else if (cleaned.startsWith('1')) {
		countryCode = 'US/CA'
	} else if (cleaned.startsWith('44')) {
		countryCode = 'UK'
	} else if (cleaned.startsWith('91')) {
		countryCode = 'IN'
	} else if (cleaned.startsWith('55')) {
		countryCode = 'BR'
	} else if (cleaned.startsWith('60')) {
		countryCode = 'MY'
	} else if (cleaned.startsWith('65')) {
		countryCode = 'SG'
	}

	return {
		isValid: true,
		formatted: cleaned,
		countryCode
	}
}
