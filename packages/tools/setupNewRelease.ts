import * as fs from 'fs-extra';
import * as path from 'path';
import yargs = require('yargs');

const rootDir = path.dirname(path.dirname(__dirname));

interface Options {
	updateVersion: boolean;
	updateDependenciesVersion: boolean;
}

interface PackageJson {
	version: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

function isJoplinPackage(name: string): boolean {
	if (!name.startsWith('@joplin/')) return false;
	if (['@joplin/turndown', '@joplin/turndown-plugin-gfm'].includes(name)) return false;
	return !name.startsWith('@joplin/fork-');
}

async function updatePackageVersion(packageFilePath: string, majorMinorVersion: string, options: Options) {
	const contentText = await fs.readFile(packageFilePath, 'utf8');
	const content: PackageJson = JSON.parse(contentText);

	if (options.updateVersion) {
		// If it's not already set
		if (content.version.indexOf(majorMinorVersion) !== 0) {
			content.version = `${majorMinorVersion}.0`;
		}
	}

	if (options.updateDependenciesVersion) {
		if (content.dependencies) {
			for (const [name] of Object.entries(content.dependencies)) {
				if (isJoplinPackage(name)) {
					content.dependencies[name] = `~${majorMinorVersion}`;
				}
			}
		}

		if (content.devDependencies) {
			for (const [name] of Object.entries(content.devDependencies)) {
				if (isJoplinPackage(name)) {
					content.devDependencies[name] = `~${majorMinorVersion}`;
				}
			}
		}
	}

	await fs.writeFile(packageFilePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

async function updateGradleVersion(filePath: string, majorMinorVersion: string) {
	const contentText = await fs.readFile(filePath, 'utf8');

	const newContent = contentText.replace(/(versionName\s+")(\d+?\.\d+?)(\.\d+")/, (_match, prefix, version, suffix) => {
		if (version === majorMinorVersion) return prefix + version + suffix;
		return `${prefix + majorMinorVersion}.0"`;
	});

	if (newContent === contentText) return;

	await fs.writeFile(filePath, newContent, 'utf8');
}

async function updateCodeProjVersion(filePath: string, majorMinorVersion: string) {
	const contentText = await fs.readFile(filePath, 'utf8');

	// MARKETING_VERSION = 10.1.0;
	const newContent = contentText.replace(/(MARKETING_VERSION = )(\d+\.\d+)(\.\d+;)/g, (_match, prefix, version, suffix) => {
		if (version === majorMinorVersion) return prefix + version + suffix;
		return `${prefix + majorMinorVersion}.0;`;
	});

	if (newContent === contentText) return;

	await fs.writeFile(filePath, newContent, 'utf8');
}

async function updateClipperManifestVersion(manifestPath: string, majorMinorVersion: string) {
	const manifestText = await fs.readFile(manifestPath, 'utf8');
	const manifest = JSON.parse(manifestText);
	const versionText = manifest.version;

	if (versionText.indexOf(majorMinorVersion) === 0) return;

	manifest.version = `${majorMinorVersion}.0`;
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
}

async function updatePluginGeneratorTemplateVersion(manifestPath: string, majorMinorVersion: string) {
	const manifestText = await fs.readFile(manifestPath, 'utf8');
	const manifest = JSON.parse(manifestText);
	manifest.app_min_version = majorMinorVersion;
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, '\t'));
}

// Need this hack to transform x.y.z into 1x.y.z due to some mistake
// on one of the release and the App Store won't allow decreasing
// the major version number.
function iosVersionHack(majorMinorVersion: string) {
	const p = majorMinorVersion.split('.');
	p[0] = `1${p[0]}`;
	return p.join('.');
}

async function main() {
	const argv: any = yargs.parserConfiguration({
		'parse-numbers': false,
		'parse-positional-numbers': false,
	}).argv;

	if (!argv._ || !argv._.length) throw new Error('Please specify the major.minor version, eg. 1.2');

	const majorMinorVersion = argv._[0];

	console.info(`New version: ${majorMinorVersion}`);

	const options: Options = {
		updateVersion: argv.updateVersion !== '0',
		updateDependenciesVersion: argv.updateDependenciesVersion !== '0',
	};

	if (!options.updateDependenciesVersion && !options.updateVersion) throw new Error('Nothing to do!');

	await updatePackageVersion(`${rootDir}/packages/app-cli/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/app-desktop/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/app-mobile/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/generator-joplin/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/htmlpack/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/lib/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/pdf-viewer/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/plugin-repo-cli/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/react-native-alarm-notification/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/react-native-saf-x/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/renderer/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/server/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/tools/package.json`, majorMinorVersion, options);
	await updatePackageVersion(`${rootDir}/packages/utils/package.json`, majorMinorVersion, options);

	if (options.updateVersion) {
		await updateGradleVersion(`${rootDir}/packages/app-mobile/android/app/build.gradle`, majorMinorVersion);
		await updateCodeProjVersion(`${rootDir}/packages/app-mobile/ios/Joplin.xcodeproj/project.pbxproj`, iosVersionHack(majorMinorVersion));
		await updateClipperManifestVersion(`${rootDir}/packages/app-clipper/manifest.json`, majorMinorVersion);
		await updatePluginGeneratorTemplateVersion(`${rootDir}/packages/generator-joplin/generators/app/templates/src/manifest.json`, majorMinorVersion);
	}

	console.info('Version numbers have been updated. Consider running `yarn install` to update the lock files');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
