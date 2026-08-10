import { readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger';

const distCommand = 'npm run dist';
const execAsync = promisify(exec);

interface Manifest {
	version?: string;
	repository_url?: string;
}

interface PackageJson {
	name?: string;
}

const verifyBuild = async () => {
	const metadata = await validateMetadata();
	await build();
	return metadata;
};

const validateMetadata = async () => {
	logger.info('Validating metadata...');

	// process.cwd() is the plugin root dir when run via `npm run publish`
	const manifestPath = join(process.cwd(), 'src/manifest.json');
	const packageJsonPath = join(process.cwd(), 'package.json');

	let manifest: Manifest;
	let packageJson: PackageJson;
	try {
		manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
		packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
	} catch (error: unknown) {
		if (error instanceof Error) {
			error.message = `manifest.json or package.json contains invalid JSON: ${error.message}`;
		}
		throw error;
	}

	const { version } = manifest;
	const { name } = packageJson;
	const repositoryUrl = manifest.repository_url;

	if (!name || !name.startsWith('joplin-plugin-')) {
		throw new Error('Plugin name must start with \'joplin-plugin-\' in package.json');
	}

	const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
	if (!version || !semverRegex.test(version)) {
		throw new Error(`Invalid plugin version: '${version}'. Must follow semver format.`);
	}

	const cleanUrl = typeof repositoryUrl === 'string'
		? repositoryUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
		: '';
	const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;

	if (!cleanUrl || !githubPattern.test(cleanUrl)) {
		throw new Error('Repository URL is missing or malformed in manifest.json. Valid format: https://github.com/username/repo');
	}

	logger.success(`Metadata validated: ${name}@${version}`);
	return { name, version, repositoryUrl: cleanUrl };
};

const build = async () => {
	try {
		logger.info(`Running '${distCommand}'...`);
		await execAsync(distCommand, { cwd: process.cwd() });
		logger.success('Build verified!');
	} catch (error: unknown) {
		if (error instanceof Error) {
			error.message = `Build failed. Fix the errors above before publishing: ${error.message}`;
		}
		throw error;
	}
};

export default verifyBuild;
