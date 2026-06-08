import { execCommand } from '@joplin/utils';
import { dirname, join } from 'path';

const getSimulator = async () => {
	const simulators = JSON.parse(await execCommand('xcrun simctl list -j', { quiet: true }));

	type Device = {
		productFamily: string;
		name: string;
	};
	const deviceTypes: Device[] = simulators.devicetypes;
	// For now, always choose the first iOS simulator in the list
	return deviceTypes
		.find((device) => device.productFamily === 'iPhone')
		.name;
};

const uiTests = async () => {
	if (process.platform !== 'darwin') throw new Error('UI tests currently must run on MacOS');

	const iosDir = join(dirname(__dirname), 'ios');

	// Based on the approach taken by react-native-esbuild
	// (https://github.com/oblador/react-native-esbuild/blob/e5897955357e3fe6a48e1dd90ccb909426d24566/package.json#L9)
	await execCommand([
		'xcrun',
		'xcodebuild',
		'test',
		// Only log errors and warnings.
		'-quiet',
		'-workspace',
		join(iosDir, 'Joplin.xcworkspace'),
		'-scheme', 'Joplin',
		// Create a release build: Without this, the React Native dev server needs to be running
		// in the background:
		'-configuration', 'Release',
		'-destination', `platform=iOS Simulator,name=${await getSimulator()}`,
	], {
		env: {
			RUNNING_UI_TESTS: '1',
			XCODE_XCCONFIG_FILE: join(iosDir, 'testing.xcconfig'),
		},
	});
};

export default uiTests;
