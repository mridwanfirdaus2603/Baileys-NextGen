import { AES256GCMEncryptor, MemoryStoreDriver, useMultiStoreAuthState } from '../../Utils/multi-store-auth'

describe('Multi-Store Auth Adapter & Encrypted Storage Driver Unit Tests', () => {
	describe('AES256GCMEncryptor', () => {
		it('encrypts and decrypts string content using AES-256-GCM', () => {
			const secret = 'my-super-secret-key-12345'
			const encryptor = new AES256GCMEncryptor(secret)

			const plaintext = JSON.stringify({ noiseKey: 'test-key-data', creds: 12345 })
			const encrypted = encryptor.encrypt(plaintext)

			expect(typeof encrypted).toBe('string')
			expect(encrypted).not.toEqual(plaintext)

			const decrypted = encryptor.decrypt(encrypted)
			expect(decrypted).toEqual(plaintext)
		})

		it('throws an error on corrupted payload', () => {
			const encryptor = new AES256GCMEncryptor('secret')
			expect(() => encryptor.decrypt('123456')).toThrow()
		})
	})

	describe('MemoryStoreDriver', () => {
		it('stores, retrieves, deletes, and clears items', async () => {
			const driver = new MemoryStoreDriver()

			await driver.set('key1', 'value1')
			expect(await driver.get('key1')).toBe('value1')

			await driver.del('key1')
			expect(await driver.get('key1')).toBeUndefined()

			await driver.set('key2', 'value2')
			await driver.clear()
			expect(await driver.get('key2')).toBeUndefined()
		})
	})

	describe('useMultiStoreAuthState', () => {
		it('initializes auth state with memory driver and encryption', async () => {
			const memoryDriver = new MemoryStoreDriver()
			const auth = await useMultiStoreAuthState({
				driver: memoryDriver,
				encryptionKey: 'session-encryption-key-32-chars!'
			})

			expect(auth.state.creds).toBeDefined()
			expect(auth.state.keys).toBeDefined()

			auth.state.creds.me = { id: '123456@s.whatsapp.net', name: 'TestUser' }
			await auth.saveCreds()

			const storedRawCreds = await memoryDriver.get('creds.json')
			expect(typeof storedRawCreds).toBe('string')
			// Should be encrypted hex
			expect(storedRawCreds).not.toContain('TestUser')

			// Reloading auth state with same driver and key
			const reloadedAuth = await useMultiStoreAuthState({
				driver: memoryDriver,
				encryptionKey: 'session-encryption-key-32-chars!'
			})

			expect(reloadedAuth.state.creds.me?.name).toBe('TestUser')
		})

		it('supports key storage set and get with multi-store driver', async () => {
			const memoryDriver = new MemoryStoreDriver()
			const auth = await useMultiStoreAuthState({
				driver: memoryDriver,
				encryptionKey: 'key-123'
			})

			await auth.state.keys.set({
				'pre-key': {
					p1: { private: Buffer.from('priv'), public: Buffer.from('pub') }
				}
			})

			const preKeys = await auth.state.keys.get('pre-key', ['p1'])
			expect(preKeys.p1).toBeDefined()
			expect(preKeys.p1?.private).toEqual(Buffer.from('priv'))
		})
	})
})
