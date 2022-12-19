import * as fs from 'fs-extra';

export async function readJsonFile(manifestPath: string, defaultValue: any = null): Promise<any> {
	if (!(await fs.pathExists(manifestPath))) {
		if (defaultValue === null) throw new Error(`No such file: ${manifestPath}`);
		return defaultValue;
	}

	const content = await fs.readFile(manifestPath, 'utf8');
	return JSON.parse(content);
}

function stripOffPackageOrg(name: string): string {
	const n = name.split('/');
	if (n[0][0] === '@') n.splice(0, 1);
	return n.join('/');
}

export function isJoplinPluginPackage(pack: any): boolean {
	if (!pack.keywords || !pack.keywords.includes('joplin-plugin')) return false;
	if (stripOffPackageOrg(pack.name).indexOf('joplin-plugin') !== 0) return false;
	return true;
}
