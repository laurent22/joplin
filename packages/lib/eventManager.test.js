'use strict';


const { checkThrow } = require('./testing/test-utils.js');
const eventManager = require('./eventManager').default;

describe('eventManager', function() {

	beforeEach(async () => {
		eventManager.reset();
	});

	afterEach(async () => {
		eventManager.reset();
	});

	it('should watch state props', (async () => {
		let localStateName = '';
		let callCount = 0;

		function nameWatch(event) {
			callCount++;
			localStateName = event.value;
		}

		const globalState = {
			name: 'john',
		};

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

		function nameWatch(event) {
			localStateName = event.value;
		}

		const globalState = {
			name: 'john',
		};

		eventManager.appStateOn('name', nameWatch);
		eventManager.appStateOff('name', nameWatch);
		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('');
	}));

	it('should watch nested props', (async () => {
		let localStateName = '';

		function nameWatch(event) {
			localStateName = event.value;
		}

		const globalState = {
			user: {
				name: 'john',
			},
		};

		eventManager.appStateOn('user.name', nameWatch);
		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('john');

		globalState.user.name = 'paul';

		eventManager.appStateEmit(globalState);

		expect(localStateName).toBe('paul');
	}));

	it('should not be possible to modify state props', (async () => {
		let localUser = {};

		function userWatch(event) {
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
		};

		eventManager.appStateOn('user', userWatch);
		eventManager.appStateEmit(globalState);

		expect(checkThrow(() => localUser.name = 'paul')).toBe(true);
	}));

});
