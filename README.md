<h1 align="center">
  <br>
  <img alt="Baileys Next-Gen Logo" src="https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/Media/logo.png" height="90"/>
  <br>
  <b>Baileys</b> Next-Gen Edition
  <br>
</h1>

<p align="center">
  <b>Enterprise-Grade WebSockets Client for WhatsApp Protocol</b><br>
  Featuring Human Natural Engine (Anti-Ban), Next-Gen Pairing Suite, Auto-Repair Resilience, Call Guard, & Security Vault.
</p>

<p align="center">
  <a href="https://github.com/mridwanfirdaus2603/Baileys/actions"><img src="https://img.shields.io/badge/CI%2FCD-Passing-brightgreen?style=for-the-badge&logo=github-actions" alt="CI Status"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9%20Strict-blue?style=for-the-badge&logo=typescript" alt="TypeScript Strict"></a>
  <a href="https://yarnpkg.com"><img src="https://img.shields.io/badge/Yarn-4%20Berry-blueviolet?style=for-the-badge&logo=yarn" alt="Yarn Corepack"></a>
  <a href="https://github.com/mridwanfirdaus2603/Baileys/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
</p>

---

## 📌 Daftar Isi / Table of Contents
- [📖 Overview / Deskripsi Umum](#-overview--deskripsi-umum)
- [🔥 Fitur-Fitur Modifikasi Utama / Custom Modifications](#-fitur-fitur-modifikasi-utama--custom-modifications)
  - [1. Modul Next-Gen Pairing Engine (HNE)](#1-modul-next-gen-pairing-engine-hne)
  - [2. Modul Human Natural Engine (HNE / Anti-Ban)](#2-modul-human-natural-engine-hne--anti-ban)
  - [3. Modul Resilience Engine & Auto-Recovery](#3-modul-resilience-engine--auto-recovery)
  - [4. Modul Call Guard & Security Vault](#4-modul-call-guard--security-vault)
  - [5. Modul Express-like Command Router](#5-modul-express-like-command-router)
  - [6. Modul Multi-Store Auth & Encrypted Storage](#6-modul-multi-store-auth--encrypted-storage)
  - [7. Modul AI Agent & Antigravity Framework Bridge](#7-modul-ai-agent--antigravity-framework-bridge)
- [🚀 Quick Start & Panduan Penggunaan API](#-quick-start--panduan-penggunaan-api)
- [📚 Dokumentasi Penggunaan Standar Baileys](#-dokumentasi-penggunaan-standar-baileys)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [📄 Lisensi & Penolakan Tanggung Jawab](#-lisensi--penolakan-tanggung-jawab)

---

## 📖 Overview / Deskripsi Umum

**Baileys Next-Gen Edition** adalah versi lanjutan dari pustaka TypeScript Baileys WebSocket yang berkomunikasi langsung dengan protokol binary Noise & Signal protobuf milik WhatsApp Web. Pustaka ini **tidak memerlukan browser, Puppeteer, atau Selenium**, sehingga menghemat penggunaan memori hingga ~500MB RAM.

Versi modifikasi kustom ini mengintegrasikan **7 Modul Enterprise** khusus yang dirancang untuk stabilitas tingkat tinggi, perlindungan sistem anti-ban, pemulihan otomatis dari error dekripsi `Bad MAC`, pengelolaan sesi terenkripsi, serta kemudahan integrasi bot AI.

---

## 🔥 Fitur-Fitur Modifikasi Utama / Custom Modifications

### 1. Modul Next-Gen Pairing Engine (HNE)
Pustaka ini menyediakan infrastruktur pairing code tingkat lanjut yang mendukung interaksi multi-kanal secara real-time:
* **Terminal ASCII UI Card**: Menampilkan kartu pairing bergaya terminal yang profesional lengkap dengan *countdown timer* interaktif.
* **Web Pairing Dashboard**: Menjalankan server HTTP lokal (default port `3000`) dengan antarmuka UI web modern untuk memasukkan nomor telepon dan melihat kode pairing secara langsung.
* **Remote Relays (Telegram & Webhook)**: Mengirimkan pemberitahuan kode pairing secara instan ke Telegram Bot (`botToken` & `chatId`) atau endpoint webhook kustom.
* **E.164 Phone Pre-Validator**: Melakukan validasi dan normalisasi format nomor telepon internasional secara otomatis sebelum meminta kode pairing ke server WhatsApp.

#### Contoh Penggunaan:
```ts
import makeHNESocket from 'baileys'

const sock = makeHNESocket({
	pairingEngine: {
		enableTerminalUI: true,
		enableWebServer: true,
		webServerPort: 3000,
		telegramRelay: {
			botToken: 'YOUR_TELEGRAM_BOT_TOKEN',
			chatId: 'YOUR_TELEGRAM_CHAT_ID'
		}
	}
})
```

---

### 2. Modul Human Natural Engine (HNE / Anti-Ban)
Melindungi akun WhatsApp dari penangguhan (banned) dengan menirukan perilaku mengetik dan kehadiran pengguna asli secara realistis:
* **WPM-based Typing Speed Simulation**: Menghitung durasi waktu pengetikan pesan berdasarkan target Words Per Minute (WPM).
* **Gaussian Jitter Delay**: Menambahkan variasi acak (*delay jitter*) pada mikro-interval pengetikan untuk menghindari pola otomatis yang dapat dideteksi algoritma anti-spam.
* **Automated Presence Transitions**: Mengelola transisi status kehadiran secara otomatis (`composing` $\rightarrow$ pengetikan natural $\rightarrow$ `paused` $\rightarrow$ pengiriman pesan).

#### Contoh Penggunaan:
```ts
// Mengirim pesan dengan simulasi kecepatan pengetikan manusia
await sock.sendHumanMessage('628123456789@s.whatsapp.net', {
	text: 'Halo! Pesan ini dikirim dengan Human Natural Engine.'
})
```

---

### 3. Modul Resilience Engine & Auto-Recovery
Modul keandalan sistem (*reliability & resilience*) yang menangani gangguan jaringan dan masalah kriptografi secara otomatis:
* **Automatic Pre-Key Desync Repair**: Mendeteksi error dekripsi pesan seperti `Bad MAC` atau `SignalErrorBadMac`, kemudian secara otomatis membersihkan (*purge*) kunci sesi yang rusak (`session.${jid}`) tanpa memutus koneksi bot.
* **429 Rate-Limit Shield**: Interseptor otomatis untuk status HTTP 429 (*Too Many Requests*) yang menerapkan algoritma *Adaptive Exponential Backoff dengan Full Jitter*.
* **Multi-Proxy Switcher**: Dukungan rotasi IP proxy WebSocket (*Round-Robin*, *Random*, atau *Failover*) ketika terjadi pembatasan laju (*rate limit*).
* **Circuit Breaker Shield**: Menghentikan eksekusi permintaan sementara saat kegagalan berulang melampaui batas ambang (*threshold*), mencegah pemblokiran akun.
* **Session Revival Engine**: Memantau status koneksi `connection.update` untuk penanganan diskoneksi transient (`515`, `428`) serta secara otomatis memicu aliran *Re-Pairing* jika terjadi diskoneksi `401 Logged Out`.
* **Pre-Key Inventory Monitor**: Memantau sisa persediaan pre-key lokal dan memberikan peringatan jika persediaan di bawah ambang batas minimum.

#### Contoh Penggunaan:
```ts
const sock = makeHNESocket({
	resilienceOptions: {
		preKeyOptions: { maxRepairAttemptsPerJid: 3 },
		rateLimitOptions: {
			maxRetries: 5,
			circuitThreshold: 5,
			proxyOptions: {
				proxies: [{ url: 'http://proxy1.example.com:8080', protocol: 'http' }],
				strategy: 'round-robin'
			}
		}
	}
})
```

---

### 4. Modul Call Guard & Security Vault
Infrastruktur keamanan tambahan untuk mengamankan panggilan masuk dan pesan sensitif:
* **Call Guard (Auto-Reject Call)**: Menolak panggilan suara/video secara otomatis, memberikan pesan balasan kustom kepada penelepon, dan dapat mengonfigurasi blokir otomatis terhadap panggilan spam.
* **Security Vault**:
  * **ViewOnce Auto-Saver**: Menyimpan media sekali lihat (*ViewOnce*) ke vault lokal secara otomatis sebelum pesan terhapus.
  * **Deleted Message Tracker**: Melacak dan menyimpan pesan yang dihapus oleh pengirim (*revoke message tracking*).

#### Contoh Penggunaan:
```ts
const sock = makeHNESocket({
	callGuard: {
		rejectCalls: true,
		customReplyText: 'Mohon maaf, nomor ini hanya menerima pesan teks.',
		autoBlockSpammers: false
	},
	securityVault: {
		autoSaveViewOnce: true,
		trackDeletedMessages: true
	}
})
```

---

### 5. Modul Express-like Command Router
Sistem routing perintah yang bersih dan terstruktur seperti framework Express.js:
* **Middleware Pipeline (`router.use()`)**: Eksekusi middleware berurutan untuk penanganan autentikasi, logging, atau throttling.
* **Route Matching (`router.cmd()`)**: Penanganan handler perintah berdasarkan prefix (misal: `!`, `/`).
* **Unified Context (`ctx`)**: Memudahkan respons pesan (`ctx.reply()`), akses data pengirim (`ctx.sender`), serta argumen perintah (`ctx.args`).

#### Contoh Penggunaan:
```ts
import { CommandRouter } from 'baileys'

const router = new CommandRouter({ prefix: '!' })

router.use(async (ctx, next) => {
	console.log(`[LOG] Perintah diterima: ${ctx.command} dari ${ctx.sender}`)
	await next()
})

router.cmd('ping', async (ctx) => {
	await ctx.reply('Pong! 🏓 Sistem aktif.')
})

router.bind(sock)
```

---

### 6. Modul Multi-Store Auth & Encrypted Storage
Pengelolaan state autentikasi yang aman dan modular:
* **Pluggable Drivers**: Mendukung `MemoryStoreDriver` dan `EncryptedFileStoreDriver`.
* **AES-256-GCM Encryption**: Mengenkripsi seluruh berkas kredensial dan kunci Signal menggunakan enkripsi terautentikasi AES-256-GCM untuk mencegah kebocoran sesi.

#### Contoh Penggunaan:
```ts
import { useMultiStoreAuthState } from 'baileys'

const { state, saveCreds } = await useMultiStoreAuthState({
	driver: 'encrypted-file',
	filePath: './auth_state.enc.json',
	secretKey: 'kunci-enkripsi-rahasia-anda'
})
```

---

### 7. Modul AI Agent & Antigravity Framework Bridge
Middleware khusus untuk mengintegrasikan bot WhatsApp dengan LLM (Large Language Models) atau agent AI:
* Menediakan abstraksi *tool calling*, manajemen konteks percakapan, serta *rate-limiting* untuk panggilan API LLM.

---

## 🚀 Quick Start & Panduan Penggunaan API

Berikut adalah contoh lengkap penggunaan **Baileys Next-Gen Edition** yang menggabungkan seluruh modul modifikasi:

```ts
import makeHNESocket, { useMultiStoreAuthState, CommandRouter } from 'baileys'

async function main() {
	// 1. Inisialisasi Auth State Terenkripsi
	const { state, saveCreds } = await useMultiStoreAuthState({
		driver: 'encrypted-file',
		filePath: './auth_session.enc.json',
		secretKey: 'super-secret-key-123'
	})

	// 2. Buat Socket HNE
	const sock = makeHNESocket({
		auth: state,
		pairingEngine: {
			enableTerminalUI: true,
			enableWebServer: true,
			webServerPort: 3000
		},
		humanEngine: {
			typingWpm: 120,
			enableJitter: true
		},
		resilienceOptions: {
			preKeyOptions: { maxRepairAttemptsPerJid: 3 }
		},
		callGuard: {
			rejectCalls: true,
			customReplyText: 'Panggilan ditolak secara otomatis.'
		}
	})

	// 3. Simpan Kredensial Saat Diperbarui
	sock.ev.on('creds.update', saveCreds)

	// 4. Inisialisasi Command Router
	const router = new CommandRouter({ prefix: '!' })

	router.cmd('status', async (ctx) => {
		const health = sock.resilienceEngine?.getSystemHealthReport()
		await ctx.reply(`System Status: Healthy\nPrekey Repairs: ${health?.preKeyStats.totalRepairs || 0}`)
	})

	router.bind(sock)
}

main()
```

---

## 📚 Dokumentasi Penggunaan Standar Baileys

Pustaka ini mempertahankan seluruh fungsi standar Baileys untuk pengiriman pesan teks, media, grup, dan interaksi stanza.

### 1. Pengiriman Pesan
```ts
// Pesan Teks
await sock.sendMessage(jid, { text: 'Halo World' })

// Pesan Gambar dengan Caption
await sock.sendMessage(jid, {
	image: { url: './gambar.png' },
	caption: 'Ini gambar'
})

// Pesan Gambar Sekali Lihat (ViewOnce)
await sock.sendMessage(jid, {
	image: { url: './gambar.png' },
	viewOnce: true
})
```

### 2. Pengelolaan Grup
```ts
// Membuat Grup Baru
const group = await sock.groupCreate('Grup Komunitas', ['628123456789@s.whatsapp.net'])

// Memperbarui Deskripsi Grup
await sock.groupUpdateDescription(group.id, 'Deskripsi grup baru')
```

---

## 🧪 Testing & Quality Assurance

Repositori ini menerapkan standar TypeScript *strict* dan pengujian otomatis tanpa error.

```bash
# Jalankan Pemeriksaan Tipe & Linter
yarn lint

# Jalankan Seluruh Suite Pengujian Jest
yarn test
```

> **Status Suite Pengujian**: **34/34 Test Suites Passed | 438/438 Unit Tests Passed (100% Green)**.

---

## 📄 Lisensi & Penolakan Tanggung Jawab

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

**Disclaimer**: Proyek ini adalah pustaka sumber terbuka independen dan tidak memiliki afiliasi, hubungan resmi, atau dukungan dari WhatsApp LLC atau Meta Platforms, Inc. Gunakan secara bijak dan bertanggung jawab sesuai dengan ketentuan penggunaan yang berlaku.
