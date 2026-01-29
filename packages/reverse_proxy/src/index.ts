import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import followRedirects from 'follow-redirects';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { HttpUtil, WrappedRequest } from './http_util.js';

const { http: httpFollowRedirects, https: httpsFollowRedirects } = followRedirects;
const app = express();
// JSON を大きく受けたい場合（例: 50mb）
app.use(express.json({ limit: "200mb" }));

// application/x-www-form-urlencoded を大きく受けたい場合
app.use(express.urlencoded({ limit: "200mb", extended: true }));

const PORT = process.env.PORT || 7777;
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const CERT_PATH = process.env.CERT_PATH || '../../server_cert.pem';
const KEY_PATH = process.env.KEY_PATH || '../../server_key.pem';

// Middleware to parse JSON
app.use(express.json());
// GET /image endpoint - the only valid API
app.get('/image', async (req: Request, res: Response) => {
	console.log('GET /image request received');

	try {
		const isEncrypt = HttpUtil.isEncrypte();
		const body = JSON.parse(isEncrypt ? HttpUtil.decrypt(req.body.bodyData) : req.body.bodyData);
		const safeBody: WrappedRequest = JSON.parse(JSON.stringify(body));
		if (safeBody?.headers?.Authorization) {
			safeBody.headers.Authorization = '*****';
		}

		// console.log(`body: ${JSON.stringify(safeBody, null, 2)}`);
		console.log(`${safeBody.method} ${safeBody.url}`);

		const nodeFetchOptions = HttpUtil.convertNodeFetchOptions(body);
		const result = await fetch(body.url, nodeFetchOptions);

		const wrappedResponse = await HttpUtil.convertWrappedRequest(result);

		// console.log(`response: ${wrappedResponse.status}`);
		// console.log(`headers: ${JSON.stringify(wrappedResponse.headers, null, 2)}`);
		// console.log(`body (base64Encoded: ${wrappedResponse.base64Encoded}): ${wrappedResponse.body?.substring(0, 100)}...`);
		if (HttpUtil.isEncrypte()) {
			res.status(200).send(HttpUtil.encrypt(JSON.stringify(wrappedResponse)));
		} else {
			res.status(200).json(wrappedResponse);
		}
	} catch (error) {
		console.error('Error processing /image request:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/image2', async (req: Request, res: Response) => {
	console.log('GET /image request received');

	try {
		const isEncrypt = HttpUtil.isEncrypte();
		const body = JSON.parse(isEncrypt ? HttpUtil.decrypt(req.body.bodyData) : req.body.bodyData);
		const safeBody: WrappedRequest = JSON.parse(JSON.stringify(body));
		if (safeBody?.headers?.Authorization) {
			safeBody.headers.Authorization = '*****';
		}

		// console.log(`body: ${JSON.stringify(safeBody, null, 2)}`);
		console.log(`${safeBody.method} ${safeBody.url}`);

		const url = new URL(body.url);
		const protocol = url.protocol.toLowerCase() === 'http:' ? httpFollowRedirects : httpsFollowRedirects;

		const requestOptions = {
			protocol: url.protocol,
			host: url.hostname,
			port: url.port,
			method: body.method || 'GET',
			path: url.pathname + url.search,
			headers: body.headers || {},
		};

		const requiredHeaders = ['accept-ranges', 'content-type', 'content-length', 'content-encoding', 'etag'];

		const request = protocol.request(requestOptions, async function(response) {

			// ヘッダーをコピー（暗号化なし）
			for (const [name, value] of Object.entries(response.headers)) {
				if (value && requiredHeaders.includes(name.toLowerCase())) {
					res.setHeader(name, value);
				}
			}

			// ステータスコードを設定
			res.status(response.statusCode || 200);

			if (HttpUtil.isEncrypte()) {
				// 暗号化が有効な場合
				const key = HttpUtil.getSecretKey();
				const iv = crypto.randomBytes(16); // AES-256-CTRには16バイトのIV

				// 暗号化ストリームを作成
				const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

				// IVをカスタムヘッダーで送信（復号化時に必要）
				res.setHeader('X-Encryption-IV', iv.toString('base64'));

				// ボディのみ暗号化: レスポンスストリーム → 暗号化 → クライアントへ
				response.pipe(cipher).pipe(res);
			} else {
				// 暗号化が無効な場合はそのまま転送
				response.pipe(res);
			}
		});

		request.on('error', (error) => {
			console.error('Error processing /image request:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		});

		request.end();

	} catch (error) {
		console.error('Error processing /image request:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// 404 handler for all other routes
app.use((req: Request, res: Response) => {
	res.status(404).json({
		status: 'error',
		message: 'Not Found - Only GET /image is available',
		path: req.path,
		method: req.method,
	});
});

// Start server
if (USE_HTTPS) {
	// HTTPS mode
	try {
		const httpsOptions = {
			key: fs.readFileSync(KEY_PATH),
			cert: fs.readFileSync(CERT_PATH),
		};

		https.createServer(httpsOptions, app).listen(Number(PORT), "0.0.0.0", () => {
			console.log(`Reverse proxy server running on https://localhost:${PORT} (HTTPS)`);
			console.log('Available endpoints: GET /image, GET /image2');
		});
	} catch (error) {
		console.error('Failed to start HTTPS server. Please check certificate files:', error);
		console.error(`CERT_PATH: ${CERT_PATH}`);
		console.error(`KEY_PATH: ${KEY_PATH}`);
		process.exit(1);
	}
} else {
	// HTTP mode
	http.createServer(app).listen(Number(PORT), "0.0.0.0", () => {
		console.log(`Reverse proxy server running on http://localhost:${PORT} (HTTP)`);
		console.log('Available endpoints: GET /image, GET /image2');
	});
}
