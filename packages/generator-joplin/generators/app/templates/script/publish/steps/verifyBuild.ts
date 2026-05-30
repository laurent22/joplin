import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as semver from 'semver';
const { Input } = require('enquirer');
import { FatalError } from '../utils/errors';
import logger from '../utils/logger';

export interface PluginMetadata {
	name: string;
	version: string;
	repositoryUrl: string;
}

// Validates manifest requirements (name, version, repository URL) and does
// a local build to ensure the plugin compiles cleanly before proceeding.
export async function verifyBuild(): Promise<PluginMetadata> {
	const metadata = await validateMetadata();
	await build();

	return metadata;
}

// Validates and extract plugin metadata (`Version`, `name`,`repository_url`)
async function validateMetadata(): Promise<PluginMetadata> {
	logger.info('Validating metadata...');

	// process.cwd() is the plugin root dir when run via `npm run publish`
	const manifestPath = path.join(process.cwd(), 'src/manifest.json');
	const packageJsonPath = path.join(process.cwd(), 'package.json');

	// Check if the files exist
	if (!fs.existsSync(manifestPath)) {
		throw new FatalError('manifest.json not found in src/. Are you in your plugin folder?');
	} else if (!fs.existsSync(packageJsonPath)) {
		throw new FatalError('package.json not found in the current directory. Are you in your plugin folder?');
	}

	// Extract the meta-data : `Version`, `name` and `repository_url`
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const { version } = manifest;
	const { name } = packageJson;
	const repositoryUrl = manifest.repository_url;

	if (!name || !name.startsWith('joplin-plugin-')) {
		throw new FatalError('Plugin ID must start with "joplin-plugin-"');
	}

	if (!version || !semver.valid(version)) {
		throw new FatalError(`Invalid plugin version: "${version}". Must follow semver format.`);
	}


	let cleanUrl = typeof repositoryUrl === 'string'
		? repositoryUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
		: '';
	const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;

	// If the repository_url is malformed, prompt the user in the terminal for the url
	// Max 3 fail tries
	if (!cleanUrl || !githubPattern.test(cleanUrl)) {
		logger.warn('Repository URL is missing or malformed in manifest.json.');

		let validUrl = false;
		for (let i = 0; i < 3; i++) {
			const prompt = new Input({
				message: 'Enter your GitHub repository URL (e.g. https://github.com/user/repo):',
				initial: '',
			});

			const answer = await prompt.run();
			const cleanedAnswer = answer.trim().replace(/\.git$/, '').replace(/\/$/, '');

			if (githubPattern.test(cleanedAnswer)) {
				cleanUrl = cleanedAnswer;
				validUrl = true;
				break;
			}
			logger.error(`Invalid GitHub URL format (attempt ${i + 1}/3)`);
		}

		if (!validUrl) {
			throw new FatalError('Failed to provide a valid GitHub repository URL.');
		}

		// Write the url back to manifest.json
		manifest.repository_url = cleanUrl;
		fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), 'utf8');
		logger.success('Updated manifest.json with repository URL');
	}

	logger.success(`Metadata validated: ${name}@${version}`);
	return { name, version, repositoryUrl: cleanUrl };
}

// Builds the .jpl file once to make sure there is no build errors.
// Shows all the build log in terminal (stdio: 'inherit')
async function build() {
	try {
		logger.info('Running "npm run dist"...');
		execSync('npm run dist', { stdio: 'inherit', cwd: process.cwd() });
		logger.success('Build verified!');
	} catch (error) {
		throw new FatalError('Build failed. Fix the errors above before publishing.');
	}
}
