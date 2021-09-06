import themeToCss from '@joplin/lib/services/style/themeToCss';
import * as fs from 'fs-extra';
import { rootDir } from './tool-utils';
import { filename } from '@joplin/lib/path-utils';

function themeIdFromName(name: string) {
	const nameToId: Record<string, number> = {
		light: 1,
		dark: 2,
		oledDark: 22,
		solarizedLight: 3,
		solarizedDark: 4,
		dracula: 5,
		nord: 6,
		aritimDark: 7,
	};

	if (!nameToId[name]) throw new Error(`Invalid name: ${name}`);

	return nameToId[name];
}

async function main() {
	const baseThemeDir = `${rootDir}/packages/lib/themes`;
	const themeFiles = (await fs.readdir(baseThemeDir)).filter(f => f.endsWith('.js') && f !== 'type.js');

	for (const themeFile of themeFiles) {
		const themeName = filename(themeFile);
		const themeDir = `${baseThemeDir}/${themeName}`;
		await fs.mkdirp(themeDir);

		const cssFile = `${themeDir}/colors.css`;
		const content = require(`${baseThemeDir}/${themeFile}`).default;
		const newContent = themeToCss(content);
		await fs.writeFile(cssFile, newContent, 'utf8');

		const manifestFile = `${themeDir}/manifest.json`;
		const manifestContent = {
			id: themeIdFromName(themeName),
		};
		await fs.writeFile(manifestFile, JSON.stringify(manifestContent, null, '\t'), 'utf8');
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
