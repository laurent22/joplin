import restartRelaunchArgs from './restartRelaunchArgs';

describe('restartRelaunchArgs', () => {
	test('preserves launch flags and drops node/electron argv entries', () => {
		const argv = [
			'C:\\Program Files\\electron\\electron.exe',
			'F:\\joplin\\packages\\app-desktop',
			'--env',
			'dev',
			'--profile',
			'C:\\tmp\\joplin-profile',
		];

		expect(restartRelaunchArgs(argv)).toEqual([
			'F:\\joplin\\packages\\app-desktop',
			'--env',
			'dev',
			'--profile',
			'C:\\tmp\\joplin-profile',
		]);
	});

	test('removes --relaunch from args', () => {
		const argv = [
			'/usr/bin/electron',
			'.',
			'--relaunch',
			'--env',
			'dev',
		];

		expect(restartRelaunchArgs(argv)).toEqual([
			'.',
			'--env',
			'dev',
		]);
	});
});
