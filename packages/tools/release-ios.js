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
Object.defineProperty(exports, '__esModule', { value: true });
const fs = require('fs-extra');
const tool_utils_1 = require('./tool-utils');
const mobileDir = `${tool_utils_1.rootDir}/packages/app-mobile`;
function updateCodeProjVersions(filePath) {
	return __awaiter(this, void 0, void 0, function* () {
		const originalContent = yield fs.readFile(filePath, 'utf8');
		let newContent = originalContent;
		let newVersion = '';
		// MARKETING_VERSION = 10.1.0;
		newContent = newContent.replace(/(MARKETING_VERSION = )(\d+\.\d+)\.(\d+)(.*)/g, function(_match, prefix, majorMinorVersion, buildNum, suffix) {
			const n = Number(buildNum);
			if (isNaN(n)) { throw new Error(`Invalid version code: ${buildNum}`); }
			newVersion = `${majorMinorVersion}.${n + 1}`;
			return `${prefix}${newVersion}${suffix}`;
		});
		// CURRENT_PROJECT_VERSION = 58;
		newContent = newContent.replace(/(CURRENT_PROJECT_VERSION = )(\d+)(.*)/g, function(_match, prefix, projectVersion, suffix) {
			const n = Number(projectVersion);
			if (isNaN(n)) { throw new Error(`Invalid version code: ${projectVersion}`); }
			return `${prefix}${n + 1}${suffix}`;
		});
		if (!newVersion) { throw new Error('Could not determine new version'); }
		if (newContent === originalContent) { throw new Error('No change was made to project file'); }
		yield fs.writeFile(filePath, newContent, 'utf8');
		return newVersion;
	});
}
function main() {
	return __awaiter(this, void 0, void 0, function* () {
		yield tool_utils_1.gitPullTry();
		console.info('Updating version numbers...');
		const newVersion = yield updateCodeProjVersions(`${mobileDir}/ios/Joplin.xcodeproj/project.pbxproj`);
		console.info(`New version: ${newVersion}`);
		const tagName = `ios-v${newVersion}`;
		yield tool_utils_1.execCommand2('git add -A');
		yield tool_utils_1.execCommand2(`git commit -m "${tagName}"`);
		yield tool_utils_1.execCommand2(`git tag ${tagName}`);
		yield tool_utils_1.execCommand2('git push');
		yield tool_utils_1.execCommand2('git push --tags');
		console.info(`To create changelog: node packages/tools/git-changelog.js ${tagName}`);
	});
}
main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
// # sourceMappingURL=release-ios.js.map
