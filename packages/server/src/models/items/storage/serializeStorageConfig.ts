import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';

const serializeType = (type: StorageDriverType): string => {
	if (type === StorageDriverType.Database) return 'Database';
	if (type === StorageDriverType.Filesystem) return 'Filesystem';
	if (type === StorageDriverType.Memory) return 'Memory';
	throw new Error(`Invalid type: "${type}"`);
};

const serializeMode = (mode: StorageDriverMode): string => {
	if (mode === StorageDriverMode.ReadWrite) return 'rw';
	if (mode === StorageDriverMode.ReadOnly) return 'r';
	throw new Error(`Invalid type: "${mode}"`);
};

export default function(config: StorageDriverConfig, locationOnly: boolean = true): string {
	if (!config) return '';

	const items: string[] = [];

	items.push(`Type=${serializeType(config.type)}`);

	if (config.path) items.push(`Path=${config.path}`);

	if (!locationOnly && config.mode) items.push(`Mode=${serializeMode(config.mode)}`);

	items.sort();

	return items.join('; ');
}
