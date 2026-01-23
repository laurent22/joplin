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

	const body: WrappedRequest = req.body;
	const safeBody: WrappedRequest = JSON.parse(JSON.stringify(body));
	if (safeBody?.headers?.Authorization) {
		safeBody.headers.Authorization = '*****';
	}

	console.log(`body: ${JSON.stringify(safeBody, null, 2)}`);

	const nodeFetchOptions = HttpUtil.convertNodeFetchOptions(body);
	const result = await fetch(body.url, nodeFetchOptions);
	const headers = result.headers.raw();
	const resBody = await result.body?.read?.();
	console.log(`response: ${result.status}`);
	console.log(`headers: ${JSON.stringify(headers, null, 2)}`);
	console.log(`body: ${JSON.stringify(resBody, null, 2)}`);

	const wrappedResponse = HttpUtil.convertWrappedRequest(result.status, headers, resBody);

	res.status(200).json(wrappedResponse);
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
