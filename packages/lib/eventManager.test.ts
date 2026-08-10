import { checkThrow } from './testing/test-utils';
import eventManager from './eventManager';
import type { State as AppState } from './reducer';

describe('eventManager', () => {

	beforeEach(async () => {
		eventManager.reset();
	});

	afterEach(async () => {
		eventManager.reset();
	});

	it('should watch state props', (async () => {
		let localStateName = '';
		let callCount = 0;

		function nameWatch(event: { value: string }) {
			callCount++;
			localStateName = event.value;
		}

		const globalState = {
			name: 'john',
		} as AppState & { name: string };

		eventManager.appStateOn('name', nameWatch);
		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('john');

		globalState.name = 'paul';

		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('paul');

		expect(callCount).toBe(2);

		eventManager.appStateEmit(globalState);

		expect(callCount).toBe(2);
	}));

	it('should unwatch state props', (async () => {
		let localStateName = '';

		function nameWatch(event: { value: string }) {
			localStateName = event.value;
		}

		const globalState = {
			name: 'john',
		} as AppState & { name: string };

		eventManager.appStateOn('name', nameWatch);
		eventManager.appStateOff('name', nameWatch);
		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('');
	}));

	it('should watch nested props', (async () => {
		let localStateName = '';

		function nameWatch(event: { value: string }) {
			localStateName = event.value;
		}

		const globalState = {
			user: {
				name: 'john',
			},
		} as AppState & { user: { name: string } };

		eventManager.appStateOn('user.name', nameWatch);
		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('john');

		globalState.user.name = 'paul';

		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('paul');
	}));

	it('should not be possible to modify state props', (async () => {
		let localUser: { name?: string } = {};

		function userWatch(event: { value: { name: string } }) {
			// Normally, the user should not keep a reference to the whole object
			// but make a copy. However, if they do keep a reference and try to
			// modify it, it should throw an exception as that would be an attempt
			// to directly modify the Redux state.
			localUser = event.value;
		}

		const globalState = {
			user: {
				name: 'john',
			},
		} as AppState & { user: { name: string } };

		eventManager.appStateOn('user', userWatch);
		eventManager.appStateEmit(globalState);

		expect(checkThrow(() => localUser.name = 'paul')).toBe(true);
	}));

});
