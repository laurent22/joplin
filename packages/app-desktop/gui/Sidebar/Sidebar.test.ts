import synchronizeButtonState from './synchronizeButtonState';

type SyncReport = {
	completedTime: number;
	errors: Error[];
};

describe('Sidebar', () => {
	test('should show a success icon when sync completed without errors and nothing is pending', () => {
		const syncReport: SyncReport = {
			completedTime: 123,
			errors: [],
		};

		const buttonState = synchronizeButtonState('sync', false, syncReport);

		expect(buttonState.iconName).toBe('fas fa-check');
		expect(buttonState.className).toContain('-synced');
	});

	test('should show an error icon when the last sync report contains errors', () => {
		const syncReport: SyncReport = {
			completedTime: 123,
			errors: [new Error('Fail-safe triggered')],
		};

		const buttonState = synchronizeButtonState('sync', false, syncReport);

		expect(buttonState.iconName).toBe('fas fa-exclamation-triangle');
		expect(buttonState.className).toContain('-error');
		expect(buttonState.className).not.toContain('-synced');
	});

	test('should keep the cancel button state while synchronization is active', () => {
		const syncReport: SyncReport = {
			completedTime: 123,
			errors: [new Error('Fail-safe triggered')],
		};

		const buttonState = synchronizeButtonState('cancel', false, syncReport);

		expect(buttonState.iconName).toBe('icon-sync');
		expect(buttonState.className).toContain('-syncing');
		expect(buttonState.className).not.toContain('-error');
	});
});
