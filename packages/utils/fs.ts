/* eslint-disable import/prefer-default-export */

import { GlobOptionsWithFileTypesFalse, sync } from 'glob';

// Wraps glob.sync but with good default options so that it works across
// platforms and with consistent sorting.
export const globSync = (pattern: string | string[], options: GlobOptionsWithFileTypesFalse) => {
	let output = sync(pattern, options);
	output = output.map(f => f.replace(/\\/g, '/'));
	output.sort();
	return output;
};
