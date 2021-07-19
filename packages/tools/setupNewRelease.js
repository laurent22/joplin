const fs = require('fs-extra');
const path = require('path');

const rootDir = path.dirname(path.dirname(__dirname));

async function updatePackageVersion(packageFilePath, majorMinorVersion) {
	const contentText = await fs.readFile(packageFilePath, 'utf8');
	const content = JSON.parse(contentText);

	if (content.version.indexOf(majorMinorVersion) === 0) return;

	content.version = `${majorMinorVersion}.0`;
	await fs.writeFile(packageFilePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

async function updateGradleVersion(filePath, majorMinorVersion) {
	const contentText = await fs.readFile(filePath, 'utf8');

	const newContent = contentText.replace(/(versionName\s+")(\d+?\.\d+?)(\.\d+")/, function(match, prefix, version, suffix) {
		if (version === majorMinorVersion) return prefix + version + suffix;
		return `${prefix + majorMinorVersion}.0"`;
	});

	if (newContent === contentText) return;

	await fs.writeFile(filePath, newContent, 'utf8');
}

async function updateCodeProjVersion(filePath, majorMinorVersion) {
	const contentText = await fs.readFile(filePath, 'utf8');

	// MARKETING_VERSION = 10.1.0;
	const newContent = contentText.replace(/(MARKETING_VERSION = )(\d+\.\d+)(\.\d+;)/g, function(match, prefix, version, suffix) {
		if (version === majorMinorVersion) return prefix + version + suffix;
		return `${prefix + majorMinorVersion}.0;`;
	});

	if (newContent === contentText) return;

	await fs.writeFile(filePath, newContent, 'utf8');
}

async function updateClipperManifestVersion(manifestPath, majorMinorVersion) {
	const manifestText = await fs.readFile(manifestPath, 'utf8');
	const manifest = JSON.parse(manifestText);
	const versionText = manifest.version;

	if (versionText.indexOf(majorMinorVersion) === 0) return;

	manifest.version = `${majorMinorVersion}.0`;
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
}

async function updatePluginGeneratorTemplateVersion(manifestPath, majorMinorVersion) {
	const manifestText = await fs.readFile(manifestPath, 'utf8');
	const manifest = JSON.parse(manifestText);
	manifest.app_min_version = majorMinorVersion;
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, '\t'));
}

// Need this hack to transform x.y.z into 1x.y.z due to some mistake
// on one of the release and the App Store won't allow decreasing
// the major version number.
function iosVersionHack(majorMinorVersion) {
	const p = majorMinorVersion.split('.');
	p[0] = `1${p[0]}`;
	return p.join('.');
}

async function main() {
	const argv = require('yargs').parserConfiguration({
		'parse-numbers': false,
	}).argv;

	if (!argv._ || !argv._.length) throw new Error('Please specify the major.minor version, eg. 1.2');

	const majorMinorVersion = argv._[0];

	await updatePackageVersion(`${rootDir}/packages/app-desktop/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/app-cli/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/generator-joplin/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/server/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/plugin-repo-cli/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/lib/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/renderer/package.json`, majorMinorVersion);
	await updatePackageVersion(`${rootDir}/packages/tools/package.json`, majorMinorVersion);
	await updateGradleVersion(`${rootDir}/packages/app-mobile/android/app/build.gradle`, majorMinorVersion);
	await updateCodeProjVersion(`${rootDir}/packages/app-mobile/ios/Joplin.xcodeproj/project.pbxproj`, iosVersionHack(majorMinorVersion));
	await updateClipperManifestVersion(`${rootDir}/packages/app-clipper/manifest.json`, majorMinorVersion);
	await updatePluginGeneratorTemplateVersion(`${rootDir}/packages/generator-joplin/generators/app/templates/src/manifest.json`, majorMinorVersion);

	console.info('Version numbers have been updated. Consider running `npm i` to update the lock files');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
