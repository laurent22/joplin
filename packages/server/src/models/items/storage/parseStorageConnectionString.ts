// Type={Database,Filesystem,Memory,S3}; Path={/path/to/dir,https://s3bucket}

import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';

const parseType = (type: string): StorageDriverType => {
	if (type === 'Database') return StorageDriverType.Database;
	if (type === 'Filesystem') return StorageDriverType.Filesystem;
	if (type === 'Memory') return StorageDriverType.Memory;
	if (type === 'S3') return StorageDriverType.S3;
	throw new Error(`Invalid type: "${type}"`);
};

const parseMode = (mode: string): StorageDriverMode => {
	if (mode === 'ReadAndWrite') return StorageDriverMode.ReadAndWrite;
	if (mode === 'ReadAndClear') return StorageDriverMode.ReadAndClear;
	throw new Error(`Invalid type: "${mode}"`);
};

const validate = (config: StorageDriverConfig) => {
	if (!config.type) throw new Error('Type must be specified');
	if (config.type === StorageDriverType.Filesystem && !config.path) throw new Error('Path must be set for filesystem driver');
	return config;
};

export default function(connectionString: string): StorageDriverConfig | null {
	if (!connectionString) return null;

	const output: StorageDriverConfig = {
		type: null,
	};

	const items = connectionString.split(';').map(i => i.trim());

	try {
		for (const item of items) {
			if (!item) continue;

			const [key, value] = item.split('=').map(s => s.trim());

			if (key === 'Type') {
				output.type = parseType(value);
			} else if (key === 'Path') {
				output.path = value;
			} else if (key === 'Mode') {
				output.mode = parseMode(value);
			} else if (key === 'Region') {
				output.region = value;
			} else if (key === 'AccessKeyId') {
				output.accessKeyId = value;
			} else if (key === 'SecretAccessKeyId') {
				output.secretAccessKeyId = value;
			} else if (key === 'Bucket') {
				output.bucket = value;
			} else {
				throw new Error(`Invalid key: "${key}"`);
			}
		}
	} catch (error) {
		error.message = `In connection string "${connectionString}": ${error.message}`;
		throw error;
	}

	return validate(output);
}
