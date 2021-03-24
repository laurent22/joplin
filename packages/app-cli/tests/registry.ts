import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';

const sync = {
	start: jest.fn().mockReturnValue({}),
};
const syncIntervalOff = () => {
	Setting.setValue('sync.interval', 0);
	reg.setupRecurrentSync();
};

describe('Registry', function() {
	let originalSyncTarget: typeof reg.syncTarget;

	beforeAll(() => {
		Setting.setConstant('env', 'prod');
		originalSyncTarget = reg.syncTarget;
		reg.syncTarget = () => ({
			isAuthenticated: () => true,
			synchronizer: () => sync,
		});
	});

	afterAll(() => {
		Setting.setConstant('env', 'dev');
		reg.syncTarget = originalSyncTarget;
	});

	beforeEach(() => {
		jest.useFakeTimers();
		Setting.setValue('sync.interval', 300);
	});

	afterEach(syncIntervalOff);

	describe('when on mobile data', () => {

		beforeEach(() => {
			Setting.setValue('sync.mobileWifiOnly', true);
			reg.setNetworkState(true);
		});

		it('should not sync automatically', () => {
			reg.setupRecurrentSync();
			jest.runOnlyPendingTimers();

			expect(sync.start).toHaveBeenCalledTimes(0);
		});

		it('should sync if manual override is true', done => {
			void reg.scheduleSync(1, null, true)
				.then(() =>{
					expect(sync.start).toHaveBeenCalled();
					done();
				});

			jest.runOnlyPendingTimers();
		});

		it('should sync if "sync only over wifi" is disabled in settings', () => {
			Setting.setValue('sync.mobileWifiOnly', false);
			reg.setupRecurrentSync();
			jest.runOnlyPendingTimers();

			expect(sync.start).toHaveBeenCalled();
		});

	});

	describe('when not on mobile data', () => {

		beforeEach(() => {
			Setting.setValue('sync.mobileWifiOnly', true);
			reg.setNetworkState(false);
		});

		it('should sync automatically', () => {
			reg.setupRecurrentSync();
			jest.runOnlyPendingTimers();

			expect(sync.start).toHaveBeenCalled();
		});

	});
});
