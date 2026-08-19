/* eslint-disable import/prefer-default-export */

import { pathExists, readFile } from 'fs-extra';
import { writeFile } from 'fs/promises';

export const versionPatch = async () => {
	if (!(await pathExists('package.json'))) throw new Error('Run this from the root of the package (./package.json not found)');
	const content = JSON.parse(await readFile('package.json', 'utf-8'));
	const version = content.version as string;
	if (!version) throw new Error('Version field could not be updated');

	const s = version.split('.');
	s[2] = (Number(s[2]) + 1).toString();
	const newVersion = s.join('.');

	content.version = newVersion;
	await writeFile('package.json', `${JSON.stringify(content, null, '  ')}\n`, 'utf-8');

	return `v${newVersion}`;
};
