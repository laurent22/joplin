import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';

const serializeType = (type: StorageDriverType): string => {
	if (type === StorageDriverType.Database) return 'Database';
	if (type === StorageDriverType.Filesystem) return 'Filesystem';
	if (type === StorageDriverType.Memory) return 'Memory';
	if (type === StorageDriverType.S3) return 'S3';
	throw new Error(`Invalid type: "${type}"`);
};

const serializeMode = (mode: StorageDriverMode): string => {
	if (mode === StorageDriverMode.ReadAndWrite) return 'ReadAndWrite';
	if (mode === StorageDriverMode.ReadAndClear) return 'ReadAndClear';
	throw new Error(`Invalid type: "${mode}"`);
};

export default function(config: StorageDriverConfig, locationOnly = true): string {
	if (!config) return '';

	const items: string[] = [];

	items.push(`Type=${serializeType(config.type)}`);

	if (config.path) items.push(`Path=${config.path}`);
	if (config.region) items.push(`Region=${config.region}`);
	if (config.bucket) items.push(`Bucket=${config.bucket}`);

	if (!locationOnly && config.mode) items.push(`Mode=${serializeMode(config.mode)}`);

	items.sort();

	return items.join('; ');
}
