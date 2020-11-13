import { PluginManifest, PluginPermission } from './types';

export default function manifestFromObject(o: any): PluginManifest {

	const getString = (name: string, required: boolean = true, defaultValue: string = ''): string => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (typeof o[name] !== 'string') throw new Error(`Field must be a string: ${name}`);
		return o[name];
	};

	const getNumber = (name: string, required: boolean = true): number => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return 0;
		if (typeof o[name] !== 'number') throw new Error(`Field must be a number: ${name}`);
		return o[name];
	};

	const permissions: PluginPermission[] = [];

	const manifest = {
		manifest_version: getNumber('manifest_version', true),
		name: getString('name', true),
		version: getString('version', true),
		description: getString('description', false),
		homepage_url: getString('homepage_url', false),
		permissions: permissions,
	};

	if (o.permissions) {
		for (const p of o.permissions) {
			manifest.permissions.push(p);
		}
	}

	return manifest;
}
