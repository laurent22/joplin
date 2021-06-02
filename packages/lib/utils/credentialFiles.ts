const fs = require('fs-extra');

export async function credentialDir() {
	const username = require('os').userInfo().username;

	const toTry = [
		`c:/Users/${username}/joplin-credentials`,
		`/mnt/c/Users/${username}/joplin-credentials`,
		`/home/${username}/joplin-credentials`,
		`/Users/${username}/joplin-credentials`,
	];

	for (const dirPath of toTry) {
		if (await fs.pathExists(dirPath)) return dirPath;
	}

	throw new Error(`Could not find credential directory in any of these paths: ${JSON.stringify(toTry)}`);
}

export async function credentialFile(filename: string) {
	const rootDir = await credentialDir();
	const output = `${rootDir}/${filename}`;
	if (!(await fs.pathExists(output))) throw new Error(`No such file: ${output}`);
	return output;
}

export async function readCredentialFile(filename: string, defaultValue: string = '') {
	try {
		const filePath = await credentialFile(filename);
		const r = await fs.readFile(filePath);
		// There's normally no reason to keep the last new line character and it
		// can cause problems in certain scripts, so trim it. Any other white
		// space should also not be relevant.
		return r.toString().trim();
	} catch (error) {
		return defaultValue;
	}
}
