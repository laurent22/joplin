import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { HttpUtil, WrappedRequest } from './http_util.js';

const app = express();
const PORT = process.env.PORT || 7777;

// Middleware to parse JSON
app.use(express.json());

// GET /image endpoint - the only valid API
app.get('/image', async (req: Request, res: Response) => {
	console.log('GET /image request received');

	try {
		const body: WrappedRequest = req.body;
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

		res.status(200).json(wrappedResponse);
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
