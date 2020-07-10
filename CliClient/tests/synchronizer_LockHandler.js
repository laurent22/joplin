'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const LockHandler_1 = require('lib/services/synchronizer/LockHandler');
require('app-module-path').addPath(__dirname);
const { asyncTest, fileApi, setupDatabaseAndSynchronizer, switchClient, msleep, expectThrow, expectNotThrow } = require('test-utils.js');
process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
let lockHandler_ = null;
const locksDirname = 'locks';
function lockHandler() {
	if (lockHandler_) { return lockHandler_; }
	lockHandler_ = new LockHandler_1.default(fileApi(), locksDirname);
	return lockHandler_;
}
describe('synchronizer_LockHandler', function() {
	beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
		lockHandler_ = null;
		yield setupDatabaseAndSynchronizer(1);
		yield setupDatabaseAndSynchronizer(2);
		yield switchClient(1);
		done();
	}));
	it('should acquire and release a sync lock', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '123456');
		const locks = yield lockHandler().syncLocks();
		expect(locks.length).toBe(1);
		expect(locks[0].type).toBe(LockHandler_1.LockType.Sync);
		expect(locks[0].clientId).toBe('123456');
		expect(locks[0].clientType).toBe('mobile');
		yield lockHandler().releaseLock(LockHandler_1.LockType.Sync, 'mobile', '123456');
		expect((yield lockHandler().syncLocks()).length).toBe(0);
	})));
	it('should allow multiple sync locks', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
		yield switchClient(2);
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
		expect((yield lockHandler().syncLocks()).length).toBe(2);
		{
			yield lockHandler().releaseLock(LockHandler_1.LockType.Sync, 'mobile', '222');
			const locks = yield lockHandler().syncLocks();
			expect(locks.length).toBe(1);
			expect(locks[0].clientId).toBe('111');
		}
	})));
	it('should refresh sync lock timestamp when acquiring again', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
		const beforeTime = (yield lockHandler().syncLocks())[0].updatedTime;
		yield msleep(1);
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
		const afterTime = (yield lockHandler().syncLocks())[0].updatedTime;
		expect(beforeTime).toBeLessThan(afterTime);
	})));
	it('should not allow sync locks if there is an exclusive lock', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		yield lockHandler().acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '111');
		expectThrow(() => __awaiter(this, void 0, void 0, function* () {
			yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
		}), 'hasExclusiveLock');
	})));
	it('should not allow exclusive lock if there are sync locks', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		lockHandler().syncLockMaxAge = 1000 * 60 * 60;
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
		expectThrow(() => __awaiter(this, void 0, void 0, function* () {
			yield lockHandler().acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '333');
		}), 'hasSyncLock');
	})));
	it('should allow exclusive lock if the sync locks have expired', asyncTest(() => __awaiter(this, void 0, void 0, function* () {
		lockHandler().syncLockMaxAge = 1;
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
		yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
		yield msleep(2);
		expectNotThrow(() => __awaiter(this, void 0, void 0, function* () {
			yield lockHandler().acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '333');
		}));
	})));
});
// # sourceMappingURL=synchronizer_LockHandler.js.map
