
let currentProfileDirectory: string;

jest.doMock('../bridge', () => ({
	// Mock the bridge functions used by restartInSafeModeFromMain
	// to remove the dependency on Electron.
	default: () => ({
		restart: jest.fn(),
		processArgv: () => [
			// The argument parser expects the first two arguments to
			// be the path to NodeJS and the second to be the main filename.
			process.argv[0], __filename,

			// Only the following arguments are used.
			'--profile', currentProfileDirectory,
		],
		env: () => 'dev',
		appName: () => 'joplin-desktop',
	}),
}));

import { mkdtemp, readFile, remove } from 'fs-extra';
import restartInSafeModeFromMain from './restartInSafeModeFromMain';
import { tmpdir } from 'os';
import { join } from 'path';
import { safeModeFlagFilename } from '@joplin/lib/BaseApplication';


describe('restartInSafeModeFromMain', () => {
	beforeEach(async () => {
		currentProfileDirectory = await mkdtemp(join(tmpdir(), 'safemode-restart-test'));
	});

	afterEach(async () => {
		await remove(currentProfileDirectory);
	});

	test('should create a safe mode flag file', async () => {
		await restartInSafeModeFromMain();
		const safeModeFlagFilepath = join(
			currentProfileDirectory, safeModeFlagFilename,
		);
		expect(await readFile(safeModeFlagFilepath, 'utf8')).toBe('true');
	});
});

