// Type={Database,Filesystem,Memory,S3}; Path={/path/to/dir,https://s3bucket}

import { ContentDriverConfig, ContentDriverMode, ContentDriverConfigType } from '../../utils/types';

const parseType = (type: string): ContentDriverConfigType => {
	if (type === 'Database') return ContentDriverConfigType.Database;
	if (type === 'Filesystem') return ContentDriverConfigType.Filesystem;
	if (type === 'Memory') return ContentDriverConfigType.Memory;
	throw new Error(`Invalid type: ${type}`);
};

const parseMode = (mode: string): ContentDriverMode => {
	if (mode === 'rw') return ContentDriverMode.ReadWrite;
	if (mode === 'r') return ContentDriverMode.ReadOnly;
	throw new Error(`Invalid type: ${mode}`);
};

export default function(connectionString: string): ContentDriverConfig | null {
	if (!connectionString) return null;

	const output: ContentDriverConfig = {
		type: ContentDriverConfigType.Database,
		path: '',
		mode: ContentDriverMode.ReadWrite,
	};

	const items = connectionString.split(';').map(i => i.trim());

	for (const item of items) {
		const [key, value] = item.split('=').map(s => s.trim());

		if (key === 'Type') {
			output.type = parseType(value);
		} else if (key === 'Path') {
			output.path = value;
		} else if (key === 'Mode') {
			output.mode = parseMode(value);
		} else {
			throw new Error(`Invalid key: ${key}`);
		}
	}

	return output;
}
