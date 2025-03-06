import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GenerateInfo {
	version: string;
	dmgPath: string;
	zipPath: string;
	releaseDate: string;
}

const calculateHash = (filePath: string): string => {
	const fileBuffer = fs.readFileSync(filePath);
	const hashSum = crypto.createHash('sha512');
	hashSum.update(fileBuffer);
	return hashSum.digest('base64');
};

const getFileSize = (filePath: string): number => {
	return fs.statSync(filePath).size;
};

export const generateLatestArm64Yml = (info: GenerateInfo, destinationPath: string): string | undefined => {
	if (!fs.existsSync(info.dmgPath) || !fs.existsSync(info.zipPath)) {
		throw new Error(`One or both executable files do not exist: ${info.dmgPath}, ${info.zipPath}`);
	}
	if (!info.version) {
		throw new Error('Version is empty');
	}
	if (!destinationPath) {
		throw new Error('Destination path is empty');
	}

	console.info('Calculating hash of files...');
	const dmgHash: string = calculateHash(info.dmgPath);
	const zipHash: string = calculateHash(info.zipPath);

	console.info('Calculating size of files...');
	const dmgSize: number = getFileSize(info.dmgPath);
	const zipSize: number = getFileSize(info.zipPath);

	console.info('Generating content of latest-mac-arm64.yml file...');

	if (!fs.existsSync(destinationPath)) {
		fs.mkdirSync(destinationPath);
	}

	const yamlFilePath: string = path.join(destinationPath, 'latest-mac-arm64.yml');
	const yamlContent = `version: ${info.version}
files:
  - url: ${path.basename(info.zipPath)}
    sha512: ${zipHash}
    size: ${zipSize}
  - url: ${path.basename(info.dmgPath)}
    sha512: ${dmgHash}
    size: ${dmgSize}
path: ${path.basename(info.zipPath)}
sha512: ${zipHash}
releaseDate: '${info.releaseDate}'
`;

	fs.writeFileSync(yamlFilePath, yamlContent);
	console.log(`YML file for version ${info.version} was generated successfully at ${destinationPath} for arm64.`);

	const fileContent: string = fs.readFileSync(yamlFilePath, 'utf8');
	console.log('Generated YML Content:\n', fileContent);

	return yamlFilePath;
};
