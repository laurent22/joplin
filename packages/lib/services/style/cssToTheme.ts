import { Theme } from '../../themes/type';
import * as cssParser from 'css';

function formatCssToThemeVariable(cssVariable: string): string {
	const elements = cssVariable.substr(2).split('-');
	if (elements[0] !== 'joplin') throw new Error(`CSS variable name must start with "--joplin": ${cssVariable}`);

	elements.splice(0, 1);

	return elements.map((e, i) => {
		const c = i === 0 ? e[0] : e[0].toUpperCase();
		return c + e.substr(1);
	}).join('');
}

export default function cssToTheme(css: string, sourceFilePath: string): Theme {
	const o = cssParser.parse(css, {
		silent: false,
		source: sourceFilePath,
	});

	if (!o?.stylesheet?.rules?.length) throw new Error(`Invalid CSS color file: ${sourceFilePath}`);

	// Need "as any" because outdated TS definition file

	const rootRule = o.stylesheet.rules[0];
	if (!(rootRule as any).selectors.includes(':root')) throw new Error('`:root` rule not found');

	const declarations: cssParser.Declaration[] = (rootRule as any).declarations;

	const output: any = {};
	for (const declaration of declarations) {
		if (declaration.type !== 'declaration') continue; // Skip comment lines
		output[formatCssToThemeVariable(declaration.property)] = declaration.value;
	}

	return output;
}
