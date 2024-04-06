import { Theme } from '../../themes/type';

// Need to include it that way due to a bug in the lib:
// https://github.com/reworkcss/css/pull/146#issuecomment-740412799
import { CssRuleAST, CssTypes, parse as cssParse } from '@adobe/css-tools';

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

	const rules = o?.stylesheet?.rules;

	if (!rules?.length) throw new Error(`Invalid CSS color file: ${sourceFilePath}`);

	let rootRule: CssRuleAST|null = null;
	for (const rule of rules) {
		if (rule.type === CssTypes.rule) {
			rootRule = rule;
			break;
		}
	}

	if (!rootRule || !rootRule.selectors.includes(':root')) throw new Error('`:root` rule not found');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const declarations: any[] = rootRule.declarations;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};
	for (const declaration of declarations) {
		if (declaration.type !== 'declaration') continue; // Skip comment lines
		output[formatCssToThemeVariable(declaration.property)] = declaration.value;
	}

	return output;
}
