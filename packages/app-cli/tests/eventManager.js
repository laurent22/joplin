'use strict';


const { asyncTest,checkThrow } = require('./test-utils.js');
const eventManager = require('@joplin/lib/eventManager').default;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('eventManager', function() {

	beforeEach(async (done) => {
		eventManager.reset();
		done();
	});

	afterEach(async (done) => {
		eventManager.reset();
		done();
	});

	it('should watch state props', asyncTest(async () => {
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

	it('should unwatch state props', asyncTest(async () => {
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

	it('should watch nested props', asyncTest(async () => {
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

	it('should not be possible to modify state props', asyncTest(async () => {
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
