import { AppState, createAppDefaultWindowState } from './app.reducer';
import appReducer, { createAppDefaultState } from './app.reducer';

describe('app.reducer', () => {

	it('should initialize app lock from startup settings', () => {
		const state: AppState = createAppDefaultState({});
		const passwordHash = { version: 1, algorithm: 'scrypt', hash: 'abc' };
		const newState = appReducer(state, {
			type: 'APP_LOCK_INIT',
			locked: true,
			settings: {
				'security.appLock.enabled': true,
				'security.appLock.lockOnStartup': true,
				'security.appLock.idleLockEnabled': true,
				'security.appLock.idleMinutes': 10,
				'security.appLock.passwordHash': passwordHash,
			},
		});

		expect(newState.appLock.enabled).toBe(true);
		expect(newState.appLock.locked).toBe(true);
		expect(newState.appLock.lockOnStartup).toBe(true);
		expect(newState.appLock.idleLockEnabled).toBe(true);
		expect(newState.appLock.idleMinutes).toBe(10);
	});

	it('should block navigation and dialog opening while locked', () => {
		const defaultState = createAppDefaultState({});
		const state: AppState = {
			...defaultState,
			appLock: {
				...defaultState.appLock,
				enabled: true,
				locked: true,
			},
		};

		const afterNav = appReducer(state, {
			type: 'NAV_GO',
			routeName: 'Config',
			props: {},
		});
		expect(afterNav.route.routeName).toBe('Main');

		const afterDialog = appReducer(state, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
			props: {},
		});
		expect(afterDialog.dialogs).toEqual([]);
	});

	it('should handle DIALOG_OPEN', async () => {
		const state: AppState = createAppDefaultState({});

		let newState = appReducer(state, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		});

		expect(newState.dialogs.length).toBe(1);
		expect(newState.dialogs[0].name).toBe('syncWizard');

		expect(() => appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		})).toThrow();

		newState = appReducer(newState, {
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		});

		expect(newState.dialogs.length).toBe(0);

		expect(() => appReducer(newState, {
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		})).toThrow();

		newState = appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		});

		newState = appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'setPassword',
		});

		expect(newState.dialogs).toEqual([
			{ name: 'syncWizard', props: {} },
			{ name: 'setPassword', props: {} },
		]);
	});

	it('showing a dialog in one window should hide dialogs with the same ID in background windows', () => {
		const state: AppState = {
			...createAppDefaultState({}),
			backgroundWindows: {
				testWindow: {
					...createAppDefaultWindowState(),
					windowId: 'testWindow',

					visibleDialogs: {
						testDialog: true,
					},
				},
			},
		};

		const newState = appReducer(state, {
			type: 'VISIBLE_DIALOGS_ADD',
			name: 'testDialog',
		});

		expect(newState.backgroundWindows.testWindow.visibleDialogs).toEqual({});
		expect(newState.visibleDialogs).toEqual({ testDialog: true });
	});

});
