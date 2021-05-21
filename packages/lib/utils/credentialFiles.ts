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

export async function readCredentialFile(filename: string) {
	const filePath = await credentialFile(filename);
	const r = await fs.readFile(filePath);
	return r.toString();
}
