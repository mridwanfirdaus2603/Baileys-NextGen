import { createServer, type Server } from 'http'

export interface WebPairingServerOptions {
	port?: number
	onRequestPairingCode?: (phone: string) => Promise<string>
}

/**
 * Web Pairing Portal Lightweight HTTP Server
 * Serves a lightweight HTML dashboard allowing users to input phone number and claim pairing code from mobile/browser.
 */
export function startWebPairingPortal(options: WebPairingServerOptions = {}): Server {
	const port = options.port || 3000
	const onRequestCode = options.onRequestPairingCode

	const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Next-Gen Pairing Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; text-align: center; border: 1px solid #334155; }
        h2 { color: #38bdf8; margin-bottom: 0.5rem; }
        p { color: #94a3b8; font-size: 0.9rem; }
        input { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 1rem; margin-top: 1rem; box-sizing: border-box; }
        button { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: none; background: #0284c7; color: #fff; font-size: 1rem; font-weight: bold; margin-top: 1rem; cursor: pointer; transition: 0.2s; }
        button:hover { background: #0369a1; }
        .code-box { background: #0f172a; border: 2px dashed #38bdf8; padding: 1rem; border-radius: 0.5rem; margin-top: 1.5rem; font-size: 1.8rem; font-weight: bold; letter-spacing: 4px; color: #4ade80; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚡ Next-Gen Pairing Portal</h2>
        <p>Masukkan nomor WhatsApp untuk mendapatkan kode pairing.</p>
        <input type="text" id="phone" placeholder="Contoh: 6281234567890">
        <button onclick="requestPairing()">Dapatkan Kode Pairing</button>
        <div id="result" style="display:none;" class="code-box"></div>
    </div>
    <script>
        async function requestPairing() {
            const phone = document.getElementById('phone').value.trim();
            if(!phone) return alert('Masukkan nomor HP!');
            const res = await fetch('/api/pair', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone }) });
            const data = await res.json();
            const resultDiv = document.getElementById('result');
            if(data.code) {
                resultDiv.style.display = 'block';
                resultDiv.innerText = data.code;
            } else {
                alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
            }
        }
    </script>
</body>
</html>
`

	const server = createServer(async (req, res) => {
		if (req.method === 'GET' && req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'text/html' })
			res.end(htmlPage)
			return
		}

		if (req.method === 'POST' && req.url === '/api/pair') {
			let body = ''
			req.on('data', chunk => {
				body += chunk
			})
			req.on('end', async () => {
				try {
					const { phone } = JSON.parse(body)
					if (!onRequestCode) {
						res.writeHead(400, { 'Content-Type': 'application/json' })
						res.end(JSON.stringify({ error: 'Pairing callback not configured' }))
						return
					}

					const code = await onRequestCode(phone)
					res.writeHead(200, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ code }))
				} catch (err: unknown) {
					res.writeHead(500, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }))
				}
			})
			return
		}

		res.writeHead(440, { 'Content-Type': 'text/plain' })
		res.end('Not Found')
	})

	server.listen(port)
	return server
}
