import { Theme } from '../../themes/type';

// Need to include it that way due to a bug in the lib:
// https://github.com/reworkcss/css/pull/146#issuecomment-740412799
const cssParse = require('css/lib/parse');

function formatCssToThemeVariable(cssVariable: string): string {
	const elements = cssVariable.substr(2).split('-');
	if (elements[0] !== 'joplin') throw new Error(`CSS variable name must start with "--joplin": ${cssVariable}`);

	elements.splice(0, 1);

	return elements.map((e, i) => {
		const c = i === 0 ? e[0] : e[0].toUpperCase();
		return c + e.substr(1);
	}).join('');
}

// function unquoteValue(v:string):string {
// 	if (v.startsWith("'") && v.endsWith("'") || v.startsWith('"') && v.endsWith('"')) return v.substr(1, v.length - 2);
// 	return v;
// }

export default function cssToTheme(css: string, sourceFilePath: string): Theme {
	const o = cssParse(css, {
		silent: false,
		source: sourceFilePath,
	});

	if (!o?.stylesheet?.rules?.length) throw new Error(`Invalid CSS color file: ${sourceFilePath}`);

	// Need "as any" because outdated TS definition file

	const rootRule = o.stylesheet.rules[0];
	if (!rootRule.selectors.includes(':root')) throw new Error('`:root` rule not found');

	const declarations: any[] = rootRule.declarations;

	const output: any = {};
	for (const declaration of declarations) {
		if (declaration.type !== 'declaration') continue; // Skip comment lines
		output[formatCssToThemeVariable(declaration.property)] = declaration.value;
	}

	return output;
}
