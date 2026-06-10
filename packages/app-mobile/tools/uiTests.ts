import { execCommand } from '@joplin/utils';
import { Second } from '@joplin/utils/time';
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


// Based roughly on the approach taken by react-native-esbuild
// (https://github.com/oblador/react-native-esbuild/blob/e5897955357e3fe6a48e1dd90ccb909426d24566/package.json#L9)
const uiTests = async () => {
	if (process.platform !== 'darwin') throw new Error('UI tests currently must run on MacOS');

	const iosDir = join(dirname(__dirname), 'ios');
	const workspaceFile = join(iosDir, 'Joplin.xcworkspace');

	const env = {
		RUNNING_UI_TESTS: '1',
		XCODE_XCCONFIG_FILE: join(iosDir, 'testing.xcconfig'),
	};

	const sharedOptions = [
		'-workspace',
		workspaceFile,
		'-scheme', 'Joplin',
		// Create a release build: Without this, the React Native dev server needs to be running
		// in the background:
		'-configuration', 'Release',
		'-destination', `platform=iOS Simulator,name=${await getSimulator()}`,
	];

	// Build first, in quiet mode, to avoid hundreds of thousands of lines of build output.
	const buildStart = performance.now();
	await execCommand([
		'xcrun',
		'xcodebuild',
		'build-for-testing',
		// Only log errors and warnings.
		'-quiet',
		...sharedOptions,
	], { env });
	const buildEnd = performance.now();

	console.log('Finished build in', (buildEnd - buildStart) / Second, 'seconds');

	// Run, with normal output. This makes it easier to debug test failures
	const runUiTests = () => {
		return execCommand([
			'xcrun',
			'xcodebuild',
			'test-without-building',
			...sharedOptions,

			'-retry-tests-on-failure',
			'-test-iterations', '3',
		], { env });
	};

	await runUiTests();
};

export default uiTests;
