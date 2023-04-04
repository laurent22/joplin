import { pathExistsSync, readFileSync } from 'fs-extra';

// All these calls used to be async but certain scripts need to load config
// files early, so they've been converted to sync calls. Do not convert them
// back to async.

export function credentialDir() {
	const username = require('os').userInfo().username;

	const toTry = [
		`c:/Users/${username}/joplin-credentials`,
		`/mnt/c/Users/${username}/joplin-credentials`,
		`/home/${username}/joplin-credentials`,
		`/Users/${username}/joplin-credentials`,
	];

	for (const dirPath of toTry) {
		if (pathExistsSync(dirPath)) return dirPath;
	}

	throw new Error(`Could not find credential directory in any of these paths: ${JSON.stringify(toTry)}`);
}

export const hasCredentialFile = (filename: string) => {
	let d = '';
	try {
		d = credentialDir();
	} catch (error) {
		return false;
	}

	return pathExistsSync(`${d}/${filename}`);
};

export function credentialFile(filename: string) {
	const rootDir = credentialDir();
	const output = `${rootDir}/${filename}`;
	if (!(pathExistsSync(output))) throw new Error(`No such file: ${output}`);
	return output;
}

export function readCredentialFile(filename: string, defaultValue: string = '') {
	try {
		const filePath = credentialFile(filename);
		const r = readFileSync(filePath);
		// There's normally no reason to keep the last new line character and it
		// can cause problems in certain scripts, so trim it. Any other white
		// space should also not be relevant.
		return r.toString().trim();
	} catch (error) {
		return defaultValue;
	}
}

export function readCredentialFileJson<T>(filename: string, defaultValue: T = null): T {
	const v = readCredentialFile(filename);
	if (!v) return defaultValue;

	try {
		const o = JSON.parse(v);
		return o;
	} catch (error) {
		error.message = `Could not parse JSON file ${filename}: ${error.message}`;
		throw error;
	}
}
