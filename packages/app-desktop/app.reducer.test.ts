import { AppState } from './app.reducer';
import appReducer, { createAppDefaultState } from './app.reducer';

describe('app.reducer', () => {

	it('DIALOG_OPEN', async () => {
		const state: AppState = createAppDefaultState({}, {});

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

});
