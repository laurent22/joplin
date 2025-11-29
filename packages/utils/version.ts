/* eslint-disable import/prefer-default-export */

import { pathExists, readFile } from 'fs-extra';
import execCommand from './execCommand';

export const yarnVersionPatch = async () => {
	if (!(await pathExists('package.json'))) throw new Error('Run this from the root of the package (./package.json not found)');
	await execCommand('yarn version patch', { quiet: true });
	const content = JSON.parse(await readFile('package.json', 'utf-8'));
	const newVersion = content.version;
	if (!newVersion) throw new Error('Version field could not be updated');
	return `v${newVersion}`;
};
