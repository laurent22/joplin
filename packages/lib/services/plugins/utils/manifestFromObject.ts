import { PluginManifest, PluginPermission, Screenshot, Icons } from './types';
import validatePluginId from './validatePluginId';

export default function manifestFromObject(o: any): PluginManifest {

	const getString = (name: string, required = true, defaultValue = ''): string => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (typeof o[name] !== 'string') throw new Error(`Field must be a string: ${name}`);
		return o[name];
	};

	const getNumber = (name: string, required = true): number => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return 0;
		if (typeof o[name] !== 'number') throw new Error(`Field must be a number: ${name}`);
		return o[name];
	};

	const getStrings = (name: string, required = true, defaultValue: string[] = []): string[] => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (!Array.isArray(o[name])) throw new Error(`Field must be an array: ${name}`);
		return o[name];
	};

	const getBoolean = (name: string, required = true, defaultValue = false): boolean => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (typeof o[name] !== 'boolean') throw new Error(`Field must be a boolean: ${name}`);
		return o[name];
	};

	const getScreenshots = (defaultValue: Screenshot[] = []): Screenshot[] => {
		if (!o.screenshots) return defaultValue;
		return o.screenshots;
	};

	const getIcons = (defaultValue: Icons = null): Icons => {
		if (o.icons) {
			for (const size of ['16', '32', '48', '128']) {
				if (size in o.icons) return o.icons;
			}
		}
		return defaultValue;
	};

	const permissions: PluginPermission[] = [];

	const manifest: PluginManifest = {
		manifest_version: getNumber('manifest_version', true),
		id: getString('id', true),
		name: getString('name', true),
		version: getString('version', true),
		app_min_version: getString('app_min_version', true),

		author: getString('author', false),
		description: getString('description', false),
		homepage_url: getString('homepage_url', false),
		repository_url: getString('repository_url', false),
		keywords: getStrings('keywords', false),
		categories: getStrings('categories', false),
		screenshots: getScreenshots(),
		permissions: permissions,
		icons: getIcons(),

		_recommended: getBoolean('_recommended', false, false),
		_built_in: getBoolean('_built_in', false, false),
	};

	validatePluginId(manifest.id);

	if (o.permissions) {
		for (const p of o.permissions) {
			manifest.permissions.push(p);
		}
	}

	return manifest;
}
