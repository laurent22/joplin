import { AppState, createAppDefaultWindowState } from './app.reducer';
import appReducer, { createAppDefaultState } from './app.reducer';

describe('app.reducer', () => {

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

	it('aI_STATUS_UPDATE merges a partial payload without clobbering unrelated fields', () => {
		const state: AppState = {
			...createAppDefaultState({}),
			aiStatus: { degraded: true, tokensUsed: 500, tokensBudget: 1000, lastToastShownAt: 12345 },
		};

		const afterUsage = appReducer(state, {
			type: 'AI_STATUS_UPDATE',
			payload: { tokensUsed: 600 },
		});

		expect(afterUsage.aiStatus).toEqual({
			degraded: true,
			tokensUsed: 600,
			tokensBudget: 1000,
			lastToastShownAt: 12345,
		});

		const afterToast = appReducer(afterUsage, {
			type: 'AI_STATUS_UPDATE',
			payload: { lastToastShownAt: 67890 },
		});

		expect(afterToast.aiStatus).toEqual({
			degraded: true,
			tokensUsed: 600,
			tokensBudget: 1000,
			lastToastShownAt: 67890,
		});
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
