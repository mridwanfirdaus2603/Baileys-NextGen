import { Mutex } from 'async-mutex'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { proto } from '../../WAProto/index.js'
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'
import { initAuthCreds } from './auth-utils'
import { BufferJSON } from './generics'

export interface AuthStoreDriver {
	get: (key: string) => Promise<unknown>
	set: (key: string, value: unknown) => Promise<void>
	del: (key: string) => Promise<void>
	clear?: () => Promise<void>
}

export type AuthStoreDriverType = 'memory' | 'encrypted-file' | 'redis' | AuthStoreDriver

export type MultiStoreAuthOptions = {
	driver?: AuthStoreDriverType
	folder?: string
	encryptionKey?: string | Buffer
	connectionUrl?: string
}

export class AES256GCMEncryptor {
	private key: Buffer

	constructor(secret: string | Buffer) {
		if (Buffer.isBuffer(secret)) {
			if (secret.length !== 32) {
				this.key = createHash('sha256').update(secret).digest()
			} else {
				this.key = secret
			}
		} else {
			this.key = createHash('sha256').update(secret).digest()
		}
	}

	encrypt(data: string | Buffer): string {
		const iv = randomBytes(12)
		const cipher = createCipheriv('aes-256-gcm', this.key, iv)
		const bufferData = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
		const encrypted = Buffer.concat([cipher.update(bufferData), cipher.final()])
		const tag = cipher.getAuthTag()
		const payload = Buffer.concat([iv, tag, encrypted])
		return payload.toString('hex')
	}

	decrypt(encryptedHex: string): string {
		const payload = Buffer.from(encryptedHex, 'hex')
		if (payload.length < 28) {
			throw new Error('Invalid encrypted payload length')
		}

		const iv = payload.subarray(0, 12)
		const tag = payload.subarray(12, 28)
		const ciphertext = payload.subarray(28)

		const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
		decipher.setAuthTag(tag)

		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
		return decrypted.toString('utf-8')
	}
}

export class MemoryStoreDriver implements AuthStoreDriver {
	private store = new Map<string, unknown>()

	async get(key: string): Promise<unknown> {
		return this.store.get(key)
	}

	async set(key: string, value: unknown): Promise<void> {
		if (value === undefined || value === null) {
			this.store.delete(key)
		} else {
			this.store.set(key, value)
		}
	}

	async del(key: string): Promise<void> {
		this.store.delete(key)
	}

	async clear(): Promise<void> {
		this.store.clear()
	}
}

export class EncryptedFileStoreDriver implements AuthStoreDriver {
	private fileLocks = new Map<string, Mutex>()

	constructor(private folder: string) {}

	private getLock(path: string): Mutex {
		let mutex = this.fileLocks.get(path)
		if (!mutex) {
			mutex = new Mutex()
			this.fileLocks.set(path, mutex)
		}

		return mutex
	}

	private fixFileName(file: string): string {
		return file.replace(/\//g, '__').replace(/:/g, '-')
	}

	private async ensureFolder(): Promise<void> {
		const info = await stat(this.folder).catch(() => undefined)
		if (!info) {
			await mkdir(this.folder, { recursive: true })
		}
	}

	async get(key: string): Promise<unknown> {
		try {
			await this.ensureFolder()
			const filePath = join(this.folder, this.fixFileName(key))
			const lock = this.getLock(filePath)

			return await lock.acquire().then(async release => {
				try {
					const data = await readFile(filePath, { encoding: 'utf-8' })
					return data
				} finally {
					release()
				}
			})
		} catch {
			return undefined
		}
	}

	async set(key: string, value: unknown): Promise<void> {
		await this.ensureFolder()
		const filePath = join(this.folder, this.fixFileName(key))
		const lock = this.getLock(filePath)

		await lock.acquire().then(async release => {
			try {
				if (typeof value === 'string') {
					await writeFile(filePath, value, { encoding: 'utf-8' })
				} else {
					await writeFile(filePath, JSON.stringify(value), { encoding: 'utf-8' })
				}
			} finally {
				release()
			}
		})
	}

	async del(key: string): Promise<void> {
		try {
			const filePath = join(this.folder, this.fixFileName(key))
			const lock = this.getLock(filePath)

			await lock.acquire().then(async release => {
				try {
					await unlink(filePath)
				} catch {
				} finally {
					release()
				}
			})
		} catch {}
	}
}

export const useMultiStoreAuthState = async (
	options: MultiStoreAuthOptions | string = 'baileys_auth_info'
): Promise<{
	state: AuthenticationState
	saveCreds: () => Promise<void>
	clearSession: () => Promise<void>
}> => {
	const opts: MultiStoreAuthOptions = typeof options === 'string' ? { folder: options } : options
	const folder = opts.folder || 'baileys_auth_info'

	let driver: AuthStoreDriver
	if (typeof opts.driver === 'object' && opts.driver !== null) {
		driver = opts.driver
	} else if (opts.driver === 'memory') {
		driver = new MemoryStoreDriver()
	} else {
		driver = new EncryptedFileStoreDriver(folder)
	}

	const encryptor = opts.encryptionKey ? new AES256GCMEncryptor(opts.encryptionKey) : undefined

	const readData = async (key: string): Promise<unknown> => {
		const raw = await driver.get(key)
		if (!raw) {
			return undefined
		}

		let jsonString: string
		if (typeof raw === 'string') {
			if (encryptor) {
				try {
					jsonString = encryptor.decrypt(raw)
				} catch {
					jsonString = raw
				}
			} else {
				jsonString = raw
			}
		} else {
			return raw
		}

		try {
			return JSON.parse(jsonString, BufferJSON.reviver)
		} catch {
			return undefined
		}
	}

	const writeData = async (key: string, value: unknown): Promise<void> => {
		if (value === undefined || value === null) {
			await driver.del(key)
			return
		}

		const jsonString = JSON.stringify(value, BufferJSON.replacer)
		const payload = encryptor ? encryptor.encrypt(jsonString) : jsonString
		await driver.set(key, payload)
	}

	const creds: AuthenticationCreds = ((await readData('creds.json')) as AuthenticationCreds) || initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
					await Promise.all(
						ids.map(async id => {
							let value = (await readData(`${type}-${id}.json`)) as SignalDataTypeMap[typeof type]
							if (type === 'app-state-sync-key' && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(
									value as Record<string, unknown>
								) as unknown as SignalDataTypeMap[typeof type]
							}

							data[id] = value
						})
					)

					return data
				},
				set: async data => {
					const tasks: Promise<void>[] = []
					for (const category in data) {
						for (const id in data[category as keyof SignalDataTypeMap]) {
							const value = data[category as keyof SignalDataTypeMap]![id]
							const file = `${category}-${id}.json`
							tasks.push(writeData(file, value))
						}
					}

					await Promise.all(tasks)
				}
			}
		},
		saveCreds: async () => {
			return writeData('creds.json', creds)
		},
		clearSession: async () => {
			if (driver.clear) {
				await driver.clear()
			}
		}
	}
}
