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
const tool_utils_1 = require('./tool-utils');
const appDir = `${tool_utils_1.rootDir}/packages/app-desktop`;
function main() {
	return __awaiter(this, void 0, void 0, function* () {
		yield tool_utils_1.gitPullTry(false);
		const argv = require('yargs').argv;
		process.chdir(appDir);
		console.info(`Running from: ${process.cwd()}`);
		const version = (yield tool_utils_1.execCommand2('npm version patch')).trim();
		const tagName = version;
		console.info(`New version number: ${version}`);
		console.info(yield tool_utils_1.execCommand2('git add -A'));
		console.info(yield tool_utils_1.execCommand2(`git commit -m "Desktop release ${version}"`));
		console.info(yield tool_utils_1.execCommand2(`git tag ${tagName}`));
		console.info(yield tool_utils_1.execCommand2('git push && git push --tags'));
		const releaseOptions = { isDraft: true, isPreRelease: !!argv.beta };
		console.info('Release options: ', releaseOptions);
		const release = yield tool_utils_1.githubRelease('joplin', tagName, releaseOptions);
		console.info(`Created GitHub release: ${release.html_url}`);
		console.info('GitHub release page: https://github.com/laurent22/joplin/releases');
		console.info(`To create changelog: node packages/tools/git-changelog.js ${version}`);
	});
}
main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
// # sourceMappingURL=release-electron.js.map
