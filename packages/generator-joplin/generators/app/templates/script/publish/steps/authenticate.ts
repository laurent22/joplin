// cspell:ignore rundll wslview

import { readFile, mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import logger from '../utils/logger';

const githubClientId = 'Ov23liiKfv0K6bqN2BbP';

const execFileAsync = promisify(execFile);

interface Credentials {
	token: string;
}

interface DeviceVerification {
	verification_uri: string;
	user_code: string;
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

	const deviceAuth = createOAuthDeviceAuth({
		clientType: 'oauth-app',
		clientId: githubClientId,
		scopes: ['public_repo'],
		onVerification: async ({ verification_uri, user_code }: DeviceVerification) => {
			logger.info(`
  ------ GitHub Authentication Required ------
  1. Your browser will open: ${verification_uri}
  2. Enter this code when prompted: ${user_code}

  Waiting for authorization...
  `);

			await openBrowser(verification_uri);
		},
	});

	const { token: accessToken } = await deviceAuth({ type: 'oauth' });

	await saveToken(accessToken);
	logger.success('Authenticated successfully!!');

	return accessToken;
};

// Opens browser for the given URL based on the OS the user is using
const openBrowser = async (url: string) => {
	const platform = process.platform;
	let command: string;
	let args: string[];

	if (platform === 'win32') {
		command = 'rundll32.exe';
		args = ['url.dll,FileProtocolHandler', url];
	} else if (platform === 'darwin') {
		command = 'open';
		args = [url];
	} else if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
		command = 'wslview';
		args = [url];
	} else {
		command = 'xdg-open';
		args = [url];
	}

	try {
		await execFileAsync(command, args);
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
