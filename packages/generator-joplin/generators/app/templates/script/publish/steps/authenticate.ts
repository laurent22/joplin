// cspell:ignore wslview

import { readFile, mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../utils/logger';

const githubClientId = 'Ov23liiKfv0K6bqN2BbP';

const execAsync = promisify(exec);

interface Credentials {
	token: string;
}

interface PollResponse {
	access_token?: string;
	error?: string;
	error_description?: string;
}

interface DeviceFlowResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	interval: number;
}

// ~/.config/joplin-plugin -> For saving the token received after authentication
const configDir = join(homedir(), '.config', 'joplin-plugin');
const credentialPath = join(configDir, 'credentials.json');

export const authenticate = async () => {

	// check if the user is authenticated by getting cache token
	const cachedToken = await getCachedToken();
	if (cachedToken) {
		logger.success('Using cached GitHub credentials..');
		return cachedToken;
	}

	const deviceCodeResponse = await initiateDeviceFlow(githubClientId);
	const { device_code, user_code, verification_uri, interval } = deviceCodeResponse;

	logger.info(`
  ------ GitHub Authentication Required ------
  1. Your browser will open: ${verification_uri}
  2. Enter this code when prompted: ${user_code}

  Waiting for authorization...
  `);

	await openBrowser(verification_uri);

	// repeatedly checks if the user has authenticated or not
	const accessToken = await pollForToken(device_code, interval, githubClientId);

	await saveToken(accessToken);
	logger.success('Authenticated successfully!!');

	return accessToken;
};

// Opens browser for the given URL based on the OS the user is using
const openBrowser = async (url: string) => {
	const platform = process.platform;
	let cmd: string;

	if (platform === 'win32') {
		cmd = `start "" "${url}"`;
	} else if (platform === 'darwin') {
		cmd = `open "${url}"`;
	} else if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
		cmd = `wslview "${url}"`;
	} else {
		cmd = `xdg-open "${url}"`;
	}

	try {
		await execAsync(cmd);
	} catch {
		logger.warn(`Could not open browser automatically. Please visit: ${url}`);
	}
};

const getCachedToken = async () => {
	try {
		const creds: Credentials = JSON.parse(await readFile(credentialPath, 'utf8'));
		if (typeof creds.token === 'string' && creds.token) {
			return creds.token;
		}
	} catch {
		// Ignore missing or invalid credentials and proceed to authentication
	}

	return null;
};

const initiateDeviceFlow = async (clientId: string) => {
	const response = await fetch('https://github.com/login/device/code', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify({
			client_id: clientId,
			scope: 'public_repo',
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to initiate device flow: ${response.statusText}`);
	}

	return await response.json() as DeviceFlowResponse;
};

// Checks if the user is authenticated or not every few seconds
// and returns the access_token if authenticated
const pollForToken = async (deviceCode: string, initialInterval: number, clientId: string) => {
	let interval = initialInterval;

	while (true) {
		// few second pause between each request
		await new Promise(resolve => setTimeout(resolve, interval * 1000));

		// shows a dot for each try in the terminal
		process.stdout.write('.');

		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify({
				client_id: clientId,
				device_code: deviceCode,
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
			}),
		});

		if (!response.ok) {
			throw new Error(`Polling failed: ${response.statusText}`);
		}

		const data = await response.json() as PollResponse;

		if (data.access_token) {
			process.stdout.write('\n');
			return data.access_token;
		}

		if (!data.access_token && !data.error) {
			throw new Error('Unexpected response from GitHub. Try again.');
		}

		// Continue the loop if authorization is pending or we hit rate limit
		if (data.error) {
			switch (data.error) {
			case 'authorization_pending':
				continue;
			case 'slow_down':
				interval += 5;
				continue;
			case 'expired_token':
				throw new Error('\n Authentication timed out. Run the command again.');
			case 'access_denied':
				throw new Error('\n Authentication was denied.');
			default:
				throw new Error(`\n Authentication error: ${data.error_description || data.error}`);
			}
		}
	}
};

const saveToken = async (token: string) => {
	await mkdir(configDir, { recursive: true });

	const creds: Credentials = {
		token,
	};

	await writeFile(credentialPath, JSON.stringify(creds, null, 2), {
		mode: 0o600,
		encoding: 'utf8',
	});
};

export const clearCachedToken = async () => {
	try {
		await unlink(credentialPath);
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
};
