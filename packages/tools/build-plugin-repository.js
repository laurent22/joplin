'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
// import * as fs from 'fs-extra';
const { execCommand } = require('./tool-utils.js');
function pluginInfoFromSearchResults(results) {
	const output = [];
	for (const r of results) {
		if (r.name.indexOf('joplin-plugin') !== 0) { continue; }
		if (!r.keywords || !r.keywords.includes('joplin-plugin')) { continue; }
		output.push({
			name: r.name,
			version: r.version,
			date: new Date(r.date),
		});
	}
	return output;
}
function main() {
	return __awaiter(this, void 0, void 0, function* () {
		const searchResults = (yield execCommand('npm search joplin-plugin --searchlimit 1000 --json')).trim();
		const npmPlugins = pluginInfoFromSearchResults(JSON.parse(searchResults));
		console.info(npmPlugins);
	});
}
main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
// # sourceMappingURL=build-plugin-repository.js.map
