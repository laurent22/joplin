import { useEffect, useState } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
const { camelCaseToDash, formatCssSize } = require('@joplin/lib/string-utils');

interface HookDependencies {
	pluginId: string;
	themeId: number;
}

function themeToCssVariables(theme: any) {
	const lines = [];
	lines.push(':root {');

	for (const name in theme) {
		const value = theme[name];
		if (typeof value === 'object') continue;
		if (['appearance', 'codeThemeCss', 'codeMirrorTheme'].indexOf(name) >= 0) continue;

		const newName = `--joplin-${camelCaseToDash(name)}`;

		const formattedValue = typeof value === 'number' && newName.indexOf('opacity') < 0 ? formatCssSize(value) : value;

		lines.push(`\t${newName}: ${formattedValue};`);
	}

	lines.push('}');

	return lines.join('\n');
}

export default function useThemeCss(dep: HookDependencies) {
	const { pluginId, themeId } = dep;

	const [cssFilePath, setCssFilePath] = useState('');

	useEffect(() => {
		let cancelled = false;

		async function createThemeStyleSheet() {
			const theme = themeStyle(themeId);
			const css = themeToCssVariables(theme);
			const filePath = `${Setting.value('tempDir')}/plugin_${pluginId}_theme_${themeId}.css`;

			if (!(await shim.fsDriver().exists(filePath))) {
				await shim.fsDriver().writeFile(filePath, css, 'utf8');
				if (cancelled) return;
			}

			setCssFilePath(filePath);
		}

		void createThemeStyleSheet();

		return () => {
			cancelled = true;
		};
	}, [pluginId, themeId]);

	return cssFilePath;
}
