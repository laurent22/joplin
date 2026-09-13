import selfsigned from 'selfsigned';
import https from 'node:https';
import http from 'node:http';

const startListening = (server: https.Server|http.Server) => {
	const listeningPromise = new Promise<void>((resolve, reject) => {
		const onError = (error: Error) => {
			server.off('listening', onListening);
			reject(error);
		};
		const onListening = () => {
			resolve();
			server.off('error', onError);
		};

		server.once('listening', onListening);
		server.once('error', onError);
	});
	// Arbitrary port
	server.listen(0, 'localhost');

	return listeningPromise;
};

interface Options {
	https: boolean;
}

const createLocalhostCerts = async () => {
	const rootCa = await selfsigned.generate(
		[{ name: 'commonName', value: 'ca.localhost' }],
		{
			extensions: [
				{
					name: 'basicConstraints',
					cA: true,
					critical: true,
				},
			],
		},
	);
	const localhostCert = await selfsigned.generate(
		[{ name: 'commonName', value: 'localhost' }],
		{
			algorithm: 'sha256',
			extensions: [
				{ name: 'basicConstraints', cA: false, critical: true },
				{ name: 'keyUsage', digitalSignature: true, critical: true },
				{ name: 'extKeyUsage', serverAuth: true, clientAuth: true },
				{ name: 'subjectAltName', altNames: [
					{ type: 2, value: 'localhost' },
					{ type: 2, value: 'www.localhost' },
					{ type: 7, value: '127.0.0.1' },
				] },
			],
			ca: { key: rootCa.private, cert: rootCa.cert },
		},
	);

	return { rootCa: rootCa.cert, localhost: localhostCert };
};

const createLocalhostServer = async (requestHandler: http.RequestListener, { https: useHttps }: Options) => {
	// See https://github.com/jfromaniello/selfsigned#custom-extensions
	const keys = useHttps ? await createLocalhostCerts() : undefined;

	const server = keys ? https.createServer({
		key: keys.localhost.private,
		cert: keys.localhost.cert,
	}, requestHandler) : http.createServer(requestHandler);

	await startListening(server);

	const address = server.address();
	if (typeof address === 'string') {
		throw new Error('Unexpected server.address() return type (expected AddressInfo)');
	}

	return {
		baseUrl: `${useHttps ? 'https:' : 'http:'}//localhost:${address.port}`,
		port: address.port,
		cert: keys?.rootCa,
		server,

		[Symbol.asyncDispose]() {
			return new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		},
	};
};

export default createLocalhostServer;
