import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// GET /image endpoint - the only valid API
app.get('/image', (req: Request, res: Response) => {
	console.log('GET /image request received');

	const body = req.body;
	console.log(`body: ${JSON.stringify(body)}`);
	const response = {
		status: 'success',
		message: 'Image endpoint',
		timestamp: new Date().toISOString(),
	};

	res.json(response);
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
