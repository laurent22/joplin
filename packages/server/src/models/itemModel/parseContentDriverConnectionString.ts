// Type={Database,Filesystem,Memory,S3}; Path={/path/to/dir,https://s3bucket}

import { ContentDriverConfig, ContentDriverMode, ContentDriverType } from '../../utils/types';

const parseType = (type: string): ContentDriverType => {
	if (type === 'Database') return ContentDriverType.Database;
	if (type === 'Filesystem') return ContentDriverType.Filesystem;
	if (type === 'Memory') return ContentDriverType.Memory;
	throw new Error(`Invalid type: "${type}"`);
};

const parseMode = (mode: string): ContentDriverMode => {
	if (mode === 'rw') return ContentDriverMode.ReadWrite;
	if (mode === 'r') return ContentDriverMode.ReadOnly;
	throw new Error(`Invalid type: "${mode}"`);
};

const validate = (config: ContentDriverConfig) => {
	if (config.type === ContentDriverType.Filesystem && !config.path) throw new Error('Path must be set for filesystem driver');
	return config;
};

export default function(connectionString: string): ContentDriverConfig | null {
	if (!connectionString) return null;

	const output: ContentDriverConfig = {
		type: ContentDriverType.Database,
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
