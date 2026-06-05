import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as semver from 'semver';
const { input } = require('@inquirer/prompts');
import { FatalError } from '../utils/errors';
import logger from '../utils/logger';

const DIST_COMMAND = 'npm run dist';

interface Manifest {
	version?: string;
	repository_url?: string;
}

interface PackageJson {
	name?: string;
}

export interface PluginMetadata {
	name: string;
	version: string;
	repositoryUrl: string;
}

// Validates manifest requirements (name, version, repository URL) and does
// a local build to ensure the plugin compiles cleanly before proceeding.
export async function verifyBuild(): Promise<PluginMetadata> {
	const metadata = await validateMetadata();
	build();

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
	let manifest: Manifest;
	let packageJson: PackageJson;
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
		packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
	} catch {
		throw new FatalError('manifest.json or package.json contains invalid JSON.');
	}

	const { version } = manifest;
	const { name } = packageJson;
	const repositoryUrl = manifest.repository_url;

	if (!name || !name.startsWith('joplin-plugin-')) {
		throw new FatalError('Plugin name must start with "joplin-plugin-" in package.json');
	}

	if (!version || !semver.valid(version)) {
		throw new FatalError(`Invalid plugin version: "${version}". Must follow semver format.`);
	}

	let cleanUrl = typeof repositoryUrl === 'string'
		? repositoryUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
		: '';
	const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;

	// If the repository_url is malformed, prompt the user in the terminal for the url
	if (!cleanUrl || !githubPattern.test(cleanUrl)) {
		logger.warn('Repository URL is missing or malformed in manifest.json.');

		const answer = await input({
			message: 'Enter your GitHub repository URL:',
			validate: (value: string) => githubPattern.test(value.trim().replace(/\.git$/, '').replace(/\/$/, ''))
				? true
				: 'Invalid GitHub URL format',
		});

		cleanUrl = answer.trim().replace(/\.git$/, '').replace(/\/$/, '');

		// Write the url back to manifest.json
		manifest.repository_url = cleanUrl;
		fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
		logger.success('Updated manifest.json with repository URL');
	}

	logger.success(`Metadata validated: ${name}@${version}`);
	return { name, version, repositoryUrl: cleanUrl };
}

// Builds the .jpl file once to make sure there is no build errors.
// Shows all the build log in terminal (stdio: 'inherit')
function build() {
	try {
		logger.info(`Running "${DIST_COMMAND}"...`);
		execSync(DIST_COMMAND, { stdio: 'inherit', cwd: process.cwd() });
		logger.success('Build verified!');
	} catch (error) {
		throw new FatalError('Build failed. Fix the errors above before publishing.');
	}
}
