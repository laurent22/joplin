import { Theme } from '../../themes/type';
const { camelCaseToDash, formatCssSize } = require('../../string-utils');

const isColor = (v: any) => {
	return v && typeof v === 'object' && ('color' in v) && ('model' in v) && ('valpha' in v);
};

export default function(theme: Theme) {
	const lines = [];
	lines.push(':root {');

	const names = Object.keys(theme).sort();

	for (const name of names) {
		const value = (theme as any)[name];

		if (typeof value === 'object' && !isColor(value)) continue;
		if (value === undefined || value === null) continue;
		if (typeof value === 'number' && isNaN(value)) continue;

		const newName = `--joplin-${camelCaseToDash(name)}`;
		const formattedValue = typeof value === 'number' && newName.indexOf('opacity') < 0 ? formatCssSize(value) : value;
		lines.push(`\t${newName}: ${formattedValue};`);
	}

	lines.push('}');

	return lines.join('\n');
}
