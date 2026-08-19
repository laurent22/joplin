/* eslint-disable no-console */

const { execSync } = require('child_process');
const { chdir, cwd } = require('process');
const { mkdirpSync, moveSync, pathExists } = require('fs-extra');
const { readdirSync, writeFileSync } = require('fs');
const { dirname } = require('path');

const signToolName = 'CodeSignTool.bat';

const getTempDir = () => {
	if (process.env.RUNNER_TEMP) return process.env.RUNNER_TEMP;
	if (process.env.GITHUB_WORKSPACE) return process.env.GITHUB_WORKSPACE;

	const output = `${dirname(dirname(__dirname))}/temp`;
	mkdirpSync(output);
	return output;
};

const tempDir = getTempDir();

const downloadSignTool = async () => {
	const signToolUrl = 'https://www.ssl.com/download/codesigntool-for-windows/';
	const downloadDir = `${tempDir}/signToolDownloadTemp`;
	const extractDir = `${tempDir}/signToolExtractTemp`;

	if (await pathExists(`${extractDir}/${signToolName}`)) {
		console.info('sign.js: Sign tool has already been downloaded - skipping');
		return extractDir;
	}

	mkdirpSync(downloadDir);
	mkdirpSync(extractDir);

	const response = await fetch(signToolUrl);
	if (!response.ok) throw new Error(`sign.js: HTTP error ${response.status}: ${response.statusText}`);

	const zipPath = `${downloadDir}/codeSignTool.zip`;

	const buffer = Buffer.from(await response.arrayBuffer());
	writeFileSync(zipPath, buffer);

	console.info('sign.js: Downloaded sign tool zip:', readdirSync(downloadDir));

	mkdirpSync(extractDir);

	execSync(
		`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
		{ stdio: 'inherit' },
	);

	console.info('sign.js: Extracted sign tool zip:', readdirSync(extractDir));

	return extractDir;
};

exports.default = async (configuration) => {
	const inputFilePath = configuration.path;

	const {
		SSL_ESIGNER_USER_NAME,
		SSL_ESIGNER_USER_PASSWORD,
		SSL_ESIGNER_CREDENTIAL_ID,
		SSL_ESIGNER_USER_TOTP,
		SIGN_APPLICATION,
	} = process.env;

	console.info('sign.js: File to sign:', inputFilePath);

	console.info('sign.js: Using temp dir:', tempDir);

	if (SIGN_APPLICATION !== '1') {
		console.info('sign.js: SIGN_APPLICATION != 1 - not signing application');
		return;
	}

	console.info('sign.js: SIGN_APPLICATION = 1 - signing application');

	const signToolDir = await downloadSignTool();
	const signToolOutDir = `${tempDir}/signedToolOutDir`;
	mkdirpSync(signToolOutDir);

	const previousDir = cwd();
	chdir(signToolDir);

	try {
		const cmd = [
			`${signToolName} sign`,
			`-input_file_path="${inputFilePath}"`,
			`-output_dir_path="${signToolOutDir}"`,
			`-credential_id="${SSL_ESIGNER_CREDENTIAL_ID}"`,
			`-username="${SSL_ESIGNER_USER_NAME}"`,
			`-password="${SSL_ESIGNER_USER_PASSWORD}"`,
			`-totp_secret="${SSL_ESIGNER_USER_TOTP}"`,
		];

		execSync(cmd.join(' '));

		const createdFiles = readdirSync(signToolOutDir);
		console.info('sign.js: Created files:', createdFiles);

		moveSync(`${signToolOutDir}/${createdFiles[0]}`, inputFilePath, { overwrite: true });
	} catch (error) {
		console.error('sign.js: Could not sign file:', error);
		process.exit(1);
	} finally {
		chdir(previousDir);
	}
};
