const mockCaptureException = jest.fn();

jest.mock('./bridge', () => ({
	__esModule: true,
	default: () => ({ captureException: mockCaptureException }),
}));

jest.mock('electron', () => ({
	app: { on: jest.fn(), getPath: jest.fn(), getVersion: jest.fn() },
	dialog: {
		showMessageBox: jest.fn().mockResolvedValue({ response: 1 }),
	},
	screen: { getPrimaryDisplay: jest.fn(), getDisplayMatching: jest.fn() },
	BrowserWindow: jest.fn(),
	Tray: jest.fn(),
	WebContents: jest.fn(),
	nativeTheme: { shouldUseDarkColors: false },
	powerMonitor: { on: jest.fn() },
	ipcMain: { on: jest.fn(), handle: jest.fn() },
}));

jest.mock('./utils/restartInSafeModeFromMain', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue(undefined),
}));

import ElectronAppWrapper from './ElectronAppWrapper';
import type { App } from 'electron';
import type { Options } from './ElectronAppWrapper';

describe('ElectronAppWrapper', () => {
	it('should gracefully handle restart even if window is destroyed after user chooses Restart in safe mode', async () => {
		const wrapper = new ElectronAppWrapper(
			{} as App,
			{
				env: 'dev',
				profilePath: 'test-profile',
				isDebugMode: false,
				initialCallbackUrl: '',
				isEndToEndTesting: false,
			} as Options,
		);

		// Stateful ghost: not destroyed at entry (so we show dialog and run restart path),
		// then destroyed when guard runs (so we do not call forcefullyCrashRenderer).
		const mockWin = {
			isDestroyed: jest.fn().mockReturnValueOnce(false).mockReturnValue(true),
			webContents: {
				isCrashed: () => true,
				forcefullyCrashRenderer: jest.fn(),
			},
		};

		(wrapper as unknown as { win_: unknown }).win_ = mockWin;

		await expect(
			wrapper.handleAppFailure('Test Error', false, true),
		).resolves.toBeUndefined();
	});
});
