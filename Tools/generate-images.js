const dirname = require('path').dirname;
const sharp = require('sharp');
const { execCommand } = require('./tool-utils.js');

const sources = [
	{
		id: 1,
		name: 'Square_1024x1024.png',
	},
	{
		id: 2,
		name: 'macOS_16x16.png',
	},
	{
		id: 3,
		name: 'macOS_64x64.png',
	},
	{
		id: 4,
		name: 'macOS_1024x1024.png',
	},
];

function sourceById(id) {
	for (const s of sources) {
		if (s.id === id) return s;
	}
	throw new Error(`Invalid source ID: ${id}`);
}

const operations = [

	// ============================================================================
	// iOS icons
	// ============================================================================

	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ios_marketing1024x1024.png',
		width: 1024,
		height: 1024,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_app76x76.png',
		width: 76,
		height: 76,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_app76x76@2x.png',
		width: 152,
		height: 152,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_notification20x20.png',
		width: 20,
		height: 20,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_notification20x20@2x.png',
		width: 40,
		height: 40,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_pro_app83.5x83.5@2x.png',
		width: 167,
		height: 167,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_settings29x29.png',
		width: 29,
		height: 29,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_settings29x29@2x.png',
		width: 58,
		height: 58,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_spotlight40x40.png',
		width: 40,
		height: 40,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/ipad_spotlight40x40@2x.png',
		width: 80,
		height: 80,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_app60x60@2x.png',
		width: 120,
		height: 120,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_app60x60@3x.png',
		width: 180,
		height: 180,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_notification20x20@2x.png',
		width: 40,
		height: 40,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_notification20x20@3x.png',
		width: 60,
		height: 60,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_settings29x29@2x.png',
		width: 58,
		height: 58,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_settings29x29@3x.png',
		width: 87,
		height: 87,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_spotlight40x40@2x.png',
		width: 80,
		height: 80,
	},
	{
		source: 1,
		dest: 'ReactNativeClient/ios/Joplin/Images.xcassets/AppIcon.appiconset/iphone_spotlight40x40@3x.png',
		width: 120,
		height: 120,
	},

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
		source: 4,
		dest: 'Assets/macOs.iconset/icon_128x128.png',
		width: 128,
		height: 128,
	},
	{
		source: 4,
		dest: 'Assets/macOs.iconset/icon_128x128@2x.png',
		width: 256,
		height: 256,
	},
	{
		source: 4,
		dest: 'Assets/macOs.iconset/icon_256x256.png',
		width: 256,
		height: 256,
	},
	{
		source: 4,
		dest: 'Assets/macOs.iconset/icon_256x256@2x.png',
		width: 512,
		height: 512,
	},
	{
		source: 4,
		dest: 'Assets/macOs.iconset/icon_512x512.png',
		width: 512,
		height: 512,
	},
	{
		source: 4,
		dest: 'Assets/macOs.iconset/icon_512x512@2x.png',
		width: 1024,
		height: 1024,
	},
];

async function main() {
	const rootDir = dirname(__dirname);
	const sourceImageDir = `${rootDir}/Assets/ImageSources`;

	for (const operation of operations) {
		const source = sourceById(operation.source);

		const sourcePath = `${sourceImageDir}/${source.name}`;
		const destPath = `${rootDir}/${operation.dest}`;

		sharp(sourcePath)
			.resize(operation.width, operation.height, { fit: 'fill' })
			.toFile(destPath);
	}

	const icnsDest = `${rootDir}/Assets/macOs.icns`;
	const icnsSource = `${rootDir}/Assets/macOs.iconset`;
	console.info(`iconutil -c icns -o "${icnsDest}" "${icnsSource}"`);
	await execCommand(`iconutil -c icns -o "${icnsDest}" "${icnsSource}"`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
