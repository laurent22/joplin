import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import followRedirects from 'follow-redirects';
import { HttpUtil, WrappedRequest } from './http_util.js';

const { http: httpFollowRedirects, https: httpsFollowRedirects } = followRedirects;
const app = express();
const PORT = process.env.PORT || 7777;

// Middleware to parse JSON
app.use(express.json());

// GET /image endpoint - the only valid API
app.get('/image', async (req: Request, res: Response) => {
	console.log('GET /image request received');

	try {
		const body: WrappedRequest = JSON.parse(HttpUtil.decrypt(req.body.bodyData));
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

		res.status(200).send(HttpUtil.encrypt(JSON.stringify(wrappedResponse)));
	} catch (error) {
		console.error('Error processing /image request:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/image2', async (req: Request, res: Response) => {
	console.log('GET /image request received');

	try {
		const body: WrappedRequest = JSON.parse(HttpUtil.decrypt(req.body.bodyData));
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

		const requiredHeaders = ['accept-ranges', 'content-type', 'content-length', 'etag'];

		const request = protocol.request(requestOptions, async function(response) {
			// ヘッダーをコピー
			for (const [name, value] of Object.entries(response.headers)) {
				if (value && requiredHeaders.includes(name.toLowerCase())) {
					res.setHeader(name, value);
				}
			}

			// ステータスコードを設定してストリームをパイプ
			res.status(response.statusCode || 200);
			response.pipe(res);
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
app.listen(PORT, () => {
	console.log(`Reverse proxy server running on http://localhost:${PORT}`);
	console.log('Available endpoint: GET /image');
});
