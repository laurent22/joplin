// Downloads the native llama.cpp binary and model files required for Apple Silicon (Metal) GPU mode.
// Run once to set up the Metal environment, then configure .env accordingly.
//
// Usage:
//   npm run setup-metal [-- --install-dir ./htr-metal]

import { fetchWithRetry } from '@joplin/utils/net';
import { execCommand } from '@joplin/utils';
import * as fs from 'fs-extra';
import { join, resolve } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const LLAMA_RELEASE = 'b5449';
const LLAMA_ZIP = `llama-${LLAMA_RELEASE}-bin-macos-arm64.zip`;
const LLAMA_URL = `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_RELEASE}/${LLAMA_ZIP}`;
const MODEL_BASE_URL = 'https://huggingface.co/openbmb/MiniCPM-o-2_6-gguf/resolve/main';

const downloadFile = async (url: string, destPath: string) => {
	console.info(`Downloading ${url} ...`);
	const response = await fetchWithRetry(url, { retry: 3, pause: 2000 });
	if (!response || !response.ok) throw new Error(`Failed to download ${url}: ${response?.status} ${response?.statusText}`);
	await pipeline(response.body, createWriteStream(destPath));
};

const findBinary = async (dir: string, name: string): Promise<string> => {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			const found = await findBinary(fullPath, name).catch(() => '');
			if (found) return found;
		} else if (entry.name === name) {
			return fullPath;
		}
	}
	return '';
};

const main = async () => {
	const args = process.argv.slice(2);
	const installDirArg = args.indexOf('--install-dir');
	const installDir = resolve(installDirArg >= 0 ? args[installDirArg + 1] : './htr-metal');

	const binDir = join(installDir, 'bin');
	const modelsDir = join(installDir, 'models');

	await fs.mkdirp(binDir);
	await fs.mkdirp(modelsDir);

	// Download and extract llama.cpp macOS ARM binary
	const zipPath = join(installDir, LLAMA_ZIP);
	console.info(`\nDownloading llama.cpp macOS ARM binary (${LLAMA_RELEASE})...`);
	await downloadFile(LLAMA_URL, zipPath);
	console.info('Extracting...');
	await execCommand(['unzip', '-o', zipPath, '-d', binDir]);
	await fs.remove(zipPath);

	// Download model files
	console.info('\nDownloading model files...');
	await downloadFile(
		`${MODEL_BASE_URL}/Model-7.6B-Q4_K_M.gguf`,
		join(modelsDir, 'Model-7.6B-Q4_K_M.gguf'),
	);
	await downloadFile(
		`${MODEL_BASE_URL}/mmproj-model-f16.gguf`,
		join(modelsDir, 'mmproj-model-f16.gguf'),
	);

	// Find the binary
	const binaryPath = await findBinary(binDir, 'llama-mtmd-cli');
	if (!binaryPath) throw new Error('llama-mtmd-cli binary not found after extraction.');
	await fs.chmod(binaryPath, 0o755);

	console.info('\nSetup complete. Add these variables to your .env file:\n');
	console.info('HTR_CLI_GPU_TYPE=metal');
	console.info(`HTR_CLI_BINARY_PATH=${resolve(binaryPath)}`);
	console.info(`HTR_CLI_MODELS_FOLDER=${resolve(modelsDir)}`);
};

main().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});
