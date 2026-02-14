import { fileExtension } from '@joplin/lib/path-utils';
import { copyFile, pathExists, readdir, readFile, writeFile } from 'fs-extra';
import { dirname } from 'path';
import { execCommand } from './tool-utils';
const md5File = require('md5-file');
const sharp = require('sharp');

interface Source {
	id: number;
	name: string;
}

interface Operation {
	source: number;
	dest: string;

	// Name of the destination image - it can be used to reference it from `.images`
	imageName?: string;

	// The width and height of the generated image
	width?: number;
	height?: number;

	// Resize the source image to that dimensions before adding to the final image
	iconWidth?: number;
	iconHeight?: number;

	// For images that contain multiple images, such as .ico files
	images?: string[];
}

interface Results {
	done: Record<string, boolean>;
}

interface iOSAppIconContents {
	images: {
		appearances?: [
			{
				appearance: 'luminosity';
				value: 'dark' | 'tinted';
			},
		];
		filename?: string;
		idiom: 'universal';
		platform: 'ios';
		scale?: '2x' | '3x';
		size: string;
	}[];
}

const sources: Source[] = [
	{
		id: 1,
		name: 'Square_1024x1024.png',
	},
	{
		id: 2,
		name: 'RoundedCorners_16x16.png',
	},
	{
		id: 3,
		name: 'RoundedCorners_64x64.png',
	},
	{
		id: 4,
		name: 'RoundedCorners_1024x1024.png',
	},
	{
		id: 5,
		name: 'Joplin.ico',
	},
	{
		id: 6,
		name: '../JoplinLetter.png',
	},
	{
		id: 7,
		name: 'RoundedCornersMac_1024x1024.png',
	},
	{
		id: 8,
		name: 'WebsiteTopImage.png',
	},
	{
		id: 9,
		name: 'WebsiteTopImageCn.png',
	},
	{
		id: 10,
		name: 'JoplinServerIcon.svg',
	},
	{
		id: 11,
		name: 'JoplinCloudIcon.svg',
	},
	{
		id: 12,
		name: 'JoplinCloudIcon2.svg',
	},
	{
		id: 13,
		name: '../JoplinLetterBlue.svg',
	},
	{
		id: 14,
		name: 'Android/ic_launcher_background.png',
	},
	{
		id: 15,
		name: 'Android/ic_launcher_foreground.png',
	},
	{
		id: 16,
		name: 'Android/ic_launcher_round.png',
	},
	{
		id: 17,
		name: 'Android/ic_launcher.png',
	},
	{
		id: 18,
		name: 'Android/ic_launcher_foreground_drawable.png',
	},
];

function sourceById(id: number) {
	for (const s of sources) {
		if (s.id === id) return s;
	}
	throw new Error(`Invalid source ID: ${id}`);
}

const iOSReadAppIcon = async (filePath: string): Promise<iOSAppIconContents> => {
	if (!(await pathExists(filePath))) return { images: [] };
	const content = await readFile(filePath, 'utf8');
	return JSON.parse(content) as iOSAppIconContents;
};

const getAndroidOperations = () => {
	const output: Operation[] = [];

	const targetFolders = {
		'mipmap-hdpi': [72, 162],
		'mipmap-mdpi': [48, 108],
		'mipmap-xhdpi': [96, 216],
		'mipmap-xxhdpi': [144, 324],
		'mipmap-xxxhdpi': [192, 432],
	};

	for (const [folderName, sizes] of Object.entries(targetFolders)) {
		output.push({
			source: 14,
			dest: `packages/app-mobile/android/app/src/main/res/${folderName}/ic_launcher_background.png`,
			width: sizes[1],
			height: sizes[1],
		});
		output.push({
			source: 15,
			dest: `packages/app-mobile/android/app/src/main/res/${folderName}/ic_launcher_foreground.png`,
			width: sizes[1],
			height: sizes[1],
		});
		output.push({
			source: 16,
			dest: `packages/app-mobile/android/app/src/main/res/${folderName}/ic_launcher_round.png`,
			width: sizes[0],
			height: sizes[0],
		});
		output.push({
			source: 17,
			dest: `packages/app-mobile/android/app/src/main/res/${folderName}/ic_launcher.png`,
			width: sizes[0],
			height: sizes[0],
		});
	}

	output.push({
		source: 14,
		dest: 'packages/app-mobile/android/app/src/main/res/drawable/ic_launcher_background.png',
		width: 1024,
		height: 1024,
	});

	output.push({
		source: 18,
		dest: 'packages/app-mobile/android/app/src/main/res/drawable/ic_launcher_foreground.png',
		width: 572,
		height: 752,
	});

	return output;
};

const getOperations = async (rootDir: string): Promise<Operation[]> => {
	const iOSAppIconSet = 'packages/app-mobile/ios/Joplin/Images.xcassets/AppIcon.appiconset';
	const iOSAppIconSetContents = await iOSReadAppIcon(`${rootDir}/${iOSAppIconSet}/Contents.json`);

	return [
		// ============================================================================
		// iOS icons
		// ============================================================================

		...(iOSAppIconSetContents.images.map(icon => {
			const size = icon.size.split('x').map(Number),
				scale = parseInt(icon.scale, 10) || 1;
			if (!size || !icon.filename) return null;
			return [
				{
					source: 1,
					dest: `${iOSAppIconSet}/ios${icon.size}${icon.scale ? `@${icon.scale}` : ''}.png`,
					width: size[0] * scale,
					height: size[1] * scale,
				},
				{
					source: 13,
					dest: `${iOSAppIconSet}/ios_dark${icon.size}${icon.scale ? `@${icon.scale}` : ''}.png`,
					width: size[0] * scale,
					height: size[1] * scale,
				},
			];
		}).filter(ico => ico !== null)).flat(1),

		// ============================================================================
		// macOS icons
		// ============================================================================

		{
			source: 2,
			dest: 'Assets/macOs.iconset/icon_16x16.png',
			width: 16,
			height: 16,
		},
		{
			source: 3,
			dest: 'Assets/macOs.iconset/icon_16x16@2x.png',
			width: 32,
			height: 32,
		},
		{
			source: 3,
			dest: 'Assets/macOs.iconset/icon_32x32.png',
			width: 32,
			height: 32,
		},
		{
			source: 3,
			dest: 'Assets/macOs.iconset/icon_32x32@2x.png',
			width: 64,
			height: 64,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_128x128.png',
			width: 128,
			height: 128,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_128x128@2x.png',
			width: 256,
			height: 256,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_256x256.png',
			width: 256,
			height: 256,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_256x256@2x.png',
			width: 512,
			height: 512,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_512x512.png',
			width: 512,
			height: 512,
		},
		{
			source: 7,
			dest: 'Assets/macOs.iconset/icon_512x512@2x.png',
			width: 1024,
			height: 1024,
		},

		// ============================================================================
		// Linux icons
		// ============================================================================

		{
			source: 2,
			dest: 'Assets/LinuxIcons/16x16.png',
			width: 16,
			height: 16,
		},
		{
			source: 3,
			dest: 'Assets/LinuxIcons/24x24.png',
			width: 24,
			height: 24,
		},
		{
			source: 3,
			dest: 'Assets/LinuxIcons/32x32.png',
			width: 32,
			height: 32,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/48x48.png',
			width: 48,
			height: 48,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/72x72.png',
			width: 72,
			height: 72,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/96x96.png',
			width: 96,
			height: 96,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/128x128.png',
			width: 128,
			height: 128,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/144x144.png',
			width: 144,
			height: 144,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/256x256.png',
			width: 256,
			height: 256,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/512x512.png',
			width: 512,
			height: 512,
		},
		{
			source: 7,
			dest: 'Assets/LinuxIcons/1024x1024.png',
			width: 1024,
			height: 1024,
		},

		// ============================================================================
		// PortableApps launcher
		// ============================================================================

		{
			source: 5,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/appicon.ico',
		},
		{
			source: 2,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/appicon_16.png',
		},
		{
			source: 3,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/appicon_32.png',
			width: 32,
			height: 32,
		},
		{
			source: 4,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/appicon_75.png',
			width: 75,
			height: 75,
		},
		{
			source: 4,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/appicon_128.png',
			width: 128,
			height: 128,
		},
		{
			source: 4,
			dest: 'packages/tools/PortableAppsLauncher/App/AppInfo/Launcher/splash.jpg',
			width: 144,
			height: 144,
		},

		// ============================================================================
		// Windows tiles
		// ============================================================================

		{
			source: 6,
			dest: 'packages/app-desktop/build-win/icons/Square150x150Logo.png',
			width: 150,
			height: 150,
			iconWidth: 99,
			iconHeight: 75,
		},
		{
			source: 6,
			dest: 'packages/app-desktop/build-win/icons/SmallTile.png',
			width: 70,
			height: 70,
			iconWidth: 46,
			iconHeight: 46,
		},

		// ============================================================================
		// Website images
		// ============================================================================

		{
			source: 8,
			dest: 'Assets/WebsiteAssets/images/home-top-img-4x.webp',
			width: 4820,
			height: 2938,
		},
		{
			source: 8,
			dest: 'Assets/WebsiteAssets/images/home-top-img-2x.png',
			width: 2388,
			height: 1456,
		},
		{
			source: 8,
			dest: 'Assets/WebsiteAssets/images/home-top-img-2x.webp',
			width: 2388,
			height: 1456,
		},
		{
			source: 8,
			dest: 'Assets/WebsiteAssets/images/home-top-img.png',
			width: 1205,
			height: 734,
		},
		{
			source: 8,
			dest: 'Assets/WebsiteAssets/images/home-top-img.webp',
			width: 1205,
			height: 734,
		},

		// ============================================================================
		// Website images CN
		// ============================================================================

		{
			source: 9,
			dest: 'Assets/WebsiteAssets/images/home-top-img-cn-4x.webp',
			width: 4820,
			height: 2938,
		},
		{
			source: 9,
			dest: 'Assets/WebsiteAssets/images/home-top-img-cn-2x.png',
			width: 2388,
			height: 1456,
		},
		{
			source: 9,
			dest: 'Assets/WebsiteAssets/images/home-top-img-cn-2x.webp',
			width: 2388,
			height: 1456,
		},
		{
			source: 9,
			dest: 'Assets/WebsiteAssets/images/home-top-img-cn.png',
			width: 1205,
			height: 734,
		},
		{
			source: 9,
			dest: 'Assets/WebsiteAssets/images/home-top-img-cn.webp',
			width: 1205,
			height: 734,
		},

		// ============================================================================
		// Joplin Server Icons
		// ============================================================================

		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/icon-512.png',
			width: 512,
			height: 512,
		},
		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/icon-192.png',
			width: 192,
			height: 192,
		},
		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/icon-180.png',
			width: 180,
			height: 180,
		},
		{
			source: 10,
			dest: 'packages/server/public/images/server_logo.png',
			width: 512,
			height: 512,
		},
		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/icon-32.png',
			width: 32,
			height: 32,
			imageName: 'joplinServer32',
		},
		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/icon.svg',
		},
		{
			source: 10,
			dest: 'packages/server/public/images/icons/server/favicon.ico',
			images: ['joplinServer32'],
		},

		// ============================================================================
		// Joplin Cloud Icons
		// ============================================================================

		{
			source: 11,
			dest: 'packages/server/public/images/icons/cloud/icon-512.png',
			width: 512,
			height: 512,
		},
		{
			source: 11,
			dest: 'packages/server/public/images/icons/cloud/icon-192.png',
			width: 192,
			height: 192,
		},
		{
			source: 11,
			dest: 'packages/server/public/images/icons/cloud/icon-180.png',
			width: 180,
			height: 180,
		},
		{
			source: 11,
			dest: 'packages/server/public/images/cloud_logo.png',
			width: 512,
			height: 512,
		},
		{
			source: 12,
			dest: 'packages/server/public/images/icons/cloud/icon-32.png',
			width: 32,
			height: 32,
			imageName: 'joplinCloud32',
		},
		{
			source: 12,
			dest: 'packages/server/public/images/icons/cloud/icon.svg',
		},
		{
			source: 12,
			dest: 'packages/server/public/images/icons/cloud/favicon.ico',
			images: ['joplinCloud32'],
		},

		...getAndroidOperations(),
	];
};

const md5Dir = async (dirPath: string): Promise<string> => {
	const files = await readdir(dirPath);
	files.sort();
	const output: string[] = [];
	for (const file of files) {
		output.push(await md5File(`${dirPath}/${file}`));
	}
	return output.join('_');
};

const readResults = async (filePath: string): Promise<Results> => {
	if (!(await pathExists(filePath))) return { done: {} };
	const content = await readFile(filePath, 'utf8');
	return JSON.parse(content) as Results;
};

const saveResults = async (filePath: string, results: Results) => {
	await writeFile(filePath, JSON.stringify(results, null, '\t'), 'utf8');
};

const makeOperationKey = async (source: Source, sourcePath: string, operation: Operation): Promise<string> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any[] = [];
	output.push(source.id);
	output.push(await md5File(sourcePath));
	output.push(operation.dest);
	output.push(operation.width);
	output.push(operation.height);
	output.push(operation.iconWidth);
	output.push(operation.iconHeight);
	output.push(operation.imageName);
	output.push(operation.images ? operation.images.join(':') : '');
	return output.join('_');
};

async function main() {
	const rootDir = dirname(dirname(__dirname));
	const sourceImageDir = `${rootDir}/Assets/ImageSources`;
	const resultFilePath = `${__dirname}/generate-images.json`;
	const results: Results = await readResults(resultFilePath);
	const operations = await getOperations(rootDir);

	for (const operation of operations) {
		const source = sourceById(operation.source);

		const sourcePath = `${sourceImageDir}/${source.name}`;
		const destPath = `${rootDir}/${operation.dest}`;

		const sourceExt = fileExtension(sourcePath).toLowerCase();
		const destExt = fileExtension(destPath).toLowerCase();

		const operationKey = await makeOperationKey(source, sourcePath, operation);
		if (results.done[operationKey]) {
			console.info(`Skipping: ${operation.dest} (Already done)`);
			continue;
		} else {
			console.info(`Processing: ${operation.dest}`);
		}

		if ((operation.width && operation.height) || (sourceExt !== destExt)) {
			let s = sharp(sourcePath);

			if (operation.width && operation.height) {
				if (operation.iconWidth && operation.iconHeight) {
					s = s.resize(operation.iconWidth, operation.iconHeight, {
						fit: 'contain',
						background: { r: 0, g: 0, b: 0, alpha: 0 },
					}).extend({
						top: Math.floor((operation.height - operation.iconHeight) / 2),
						bottom: Math.ceil((operation.height - operation.iconHeight) / 2),
						left: Math.floor((operation.width - operation.iconWidth) / 2),
						right: Math.ceil((operation.width - operation.iconWidth) / 2),
						background: { r: 0, g: 0, b: 0, alpha: 0 },
					});
				} else {
					s = s.resize(operation.width, operation.height, { fit: 'fill' });
				}
			}

			if (destExt === 'jpg') {
				s.jpeg({ quality: 90 });
			} else if (destExt === 'png') {
				s.png({
					compressionLevel: 9,
				});
			} else if (destExt === 'webp') {
				s.webp({
					// quality: 90,
				});
			} else if (destExt === 'ico') {
				const sources: string[] = operations.filter(o => {
					return operation.images.includes(o.imageName);
				}).map(o => {
					return `${rootDir}/${o.dest}`;
				});

				await execCommand(`convert ${sources.map(s => `'${s}'`).join(' ')} "${operation.dest}"`);
			} else {
				throw new Error(`Unsupported extension: ${destExt}`);
			}

			s = s.toFile(destPath);
		} else {
			await copyFile(sourcePath, destPath);
		}

		results.done[operationKey] = true;
	}

	if (process && process.platform === 'darwin') {
		const icnsDest = `${rootDir}/Assets/macOs.icns`;
		const icnsSource = `${rootDir}/Assets/macOs.iconset`;
		const operationKey = ['icns_to_icon_set', await md5Dir(icnsSource)].join('_');
		if (!results.done[operationKey]) {
			console.info(`Processing: ${icnsDest}`);
			console.info(`iconutil -c icns -o "${icnsDest}" "${icnsSource}"`);
			await execCommand(`iconutil -c icns -o "${icnsDest}" "${icnsSource}"`);
			results.done[operationKey] = true;
		} else {
			console.info(`Skipping: ${icnsDest} (Already done)`);
		}
	} else {
		console.info('If the macOS icon has been updated, this script should be run on macOS too');
	}

	console.info(`Saving results to ${resultFilePath}`);
	await saveResults(resultFilePath, results);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
