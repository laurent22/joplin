import { Theme } from '../../themes/type';
import { filename } from '../../path-utils';
import shim from '../../shim';
import cssToTheme from './cssToTheme';

export default async function(cssBaseDir: string): Promise<Record<string, Theme>> {
	// if (!cssBaseDir) cssBaseDir = __dirname + '/../../themes';

	const themeDirs = (await shim.fsDriver().readDirStats(cssBaseDir)).filter(f => f.isDirectory());

	const output: Record<string, Theme> = {};

	for (const themeDir of themeDirs) {
		const themeName = filename(themeDir.path);
		const cssFile = `${cssBaseDir}/${themeDir.path}/colors.css`;
		const cssContent = await shim.fsDriver().readFile(cssFile, 'utf8');

		let themeId = themeName;
		const manifestFile = `${cssBaseDir}/${themeDir.path}/manifest.json`;
		if (await shim.fsDriver().exists(manifestFile)) {
			const manifest = JSON.parse(await shim.fsDriver().readFile(manifestFile, 'utf8'));
			if (manifest.id) themeId = manifest.id;
		}

		output[themeId] = cssToTheme(cssContent, cssFile);
	}

	console.info('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO', output);

	return output;
}
