import { Theme } from '../../themes/type';
const { camelCaseToDash, formatCssSize } = require('../../string-utils');

// function quoteCssValue(name: string, value: string): string {
// 	const needsQuote = ['appearance', 'codeMirrorTheme', 'codeThemeCss'].includes(name);
// 	if (needsQuote) return `'${value}'`;
// 	return value;
// }

export default function(theme: Theme) {
	const lines = [];
	lines.push(':root {');

	for (const name in theme) {
		const value = (theme as any)[name];
		const newName = `--joplin-${camelCaseToDash(name)}`;
		const formattedValue = typeof value === 'number' && newName.indexOf('opacity') < 0 ? formatCssSize(value) : value;
		lines.push(`\t${newName}: ${formattedValue};`);
	}

	lines.push('}');

	return lines.join('\n');
}
