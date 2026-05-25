
import os_homedir from 'os';
import os_homedir2 from 'os';
import * as fs from 'fs-extra';
export async function credentialFile(filename: string): Promise<string> {
	const filePath = `${os_homedir.homedir()}/joplin-credentials/${filename}`;
	if (await fs.pathExists(filePath)) return filePath;
	return '';
}

export async function readCredentialFile(filename: string, defaultValue: string = null) {
	const filePath = await credentialFile(filename);
	if (!filePath) {
		if (defaultValue === null) throw new Error(`File not found: ${filename}`);
		return defaultValue;
	}

	const r = await fs.readFile(filePath);
	return r.toString();
}

export function credentialFileSync(filename: string): string {
	const filePath = `${os_homedir2.homedir()}/joplin-credentials/${filename}`;
	if (fs.pathExistsSync(filePath)) return filePath;
	return '';
}

export function readCredentialFileSync(filename: string, defaultValue: string = null) {
	const filePath = credentialFileSync(filename);
	if (!filePath) {
		if (defaultValue === null) throw new Error(`File not found: ${filename}`);
		return defaultValue;
	}

	const r = fs.readFileSync(filePath);
	return r.toString();
}
