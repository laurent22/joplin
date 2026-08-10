import { PluginManifest, PluginPermission, Image, Icons } from './types';
import validatePluginId from './validatePluginId';
import validatePluginPlatforms from './validatePluginPlatforms';

export default function manifestFromObject(o: Record<string, unknown>): PluginManifest {

	const getString = (name: string, required = true, defaultValue = ''): string => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (typeof o[name] !== 'string') throw new Error(`Field must be a string: ${name}`);
		return o[name] as string;
	};

	const getNumber = (name: string, required = true): number => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return 0;
		if (typeof o[name] !== 'number') throw new Error(`Field must be a number: ${name}`);
		return o[name] as number;
	};

	const getStrings = (name: string, required = true, defaultValue: string[] = []): string[] => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (!Array.isArray(o[name])) throw new Error(`Field must be an array: ${name}`);
		return o[name] as string[];
	};

	const getBoolean = (name: string, required = true, defaultValue = false): boolean => {
		if (required && !o[name]) throw new Error(`Missing required field: ${name}`);
		if (!o[name]) return defaultValue;
		if (typeof o[name] !== 'boolean') throw new Error(`Field must be a boolean: ${name}`);
		return o[name] as boolean;
	};

	const getScreenshots = (defaultValue: Image[] = []): Image[] => {
		if (!o.screenshots) return defaultValue;
		return o.screenshots as Image[];
	};

	const getPromoTile = (): Image => {
		return (o.promo_tile as Image) || null;
	};

	const getIcons = (): Icons => {
		if (!o.icons) return null;
		const icons = o.icons as Icons;
		for (const size of [16, 32, 48, 128]) {
			if (icons[size as keyof Icons]) return icons;
		}
		return null;
	};

	const permissions: PluginPermission[] = [];

	const manifest: PluginManifest = {
		manifest_version: getNumber('manifest_version', true),
		id: getString('id', true),
		name: getString('name', true),
		version: getString('version', true),
		app_min_version: getString('app_min_version', true),
		app_min_version_mobile: getString('app_min_version', false),
		platforms: getStrings('platforms', false),

		author: getString('author', false),
		description: getString('description', false),
		homepage_url: getString('homepage_url', false),
		repository_url: getString('repository_url', false),
		keywords: getStrings('keywords', false),
		categories: getStrings('categories', false),
		screenshots: getScreenshots(),
		permissions: permissions,
		icons: getIcons(),
		promo_tile: getPromoTile(),

		_recommended: getBoolean('_recommended', false, false),
	};

	validatePluginId(manifest.id);
	validatePluginPlatforms(manifest.platforms);

	if (o.permissions) {
		for (const p of o.permissions as PluginPermission[]) {
			manifest.permissions.push(p);
		}
	}

	return manifest;
}
