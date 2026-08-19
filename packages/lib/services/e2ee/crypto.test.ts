import { afterAllCleanUp, expectNotThrow, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { runIntegrationTests } from './cryptoTestUtils';
import crypto from './crypto';

describe('e2ee/crypto', () => {

	beforeEach(async () => {
		jest.useRealTimers();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should encrypt and decrypt data from different devices', (async () => {
		await expectNotThrow(async () => runIntegrationTests(true));
	}));

	it('should not generate new nonce if counter does not overflow (empty counter)', (async () => {
		jest.useFakeTimers();

		const nonce = await crypto.generateNonce(new Uint8Array(36));
		expect(nonce.subarray(-8)).toEqual(new Uint8Array(8));
		const nonCounterPart = nonce.slice(0, 28);

		jest.advanceTimersByTime(1);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);

		jest.advanceTimersByTime(1);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 2]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);
	}));

	it.each([
		[[248, 249, 250, 251, 255, 0, 255, 126], [248, 249, 250, 251, 255, 0, 255, 127]],
		[[248, 249, 250, 251, 0, 255, 0, 126], [248, 249, 250, 251, 0, 255, 0, 127]],
		[[248, 249, 250, 251, 252, 253, 254, 126], [248, 249, 250, 251, 252, 253, 254, 127]],
		[[248, 249, 250, 251, 252, 253, 254, 254], [248, 249, 250, 251, 252, 253, 254, 255]],
		[[248, 249, 250, 251, 252, 253, 254, 255], [248, 249, 250, 251, 252, 253, 255, 0]],
		[[248, 249, 250, 251, 252, 253, 255, 0], [248, 249, 250, 251, 252, 253, 255, 1]],
		[[249, 250, 251, 252, 253, 254, 255, 255], [249, 250, 251, 252, 253, 255, 0, 0]],
		[[253, 254, 255, 255, 255, 255, 255, 255], [253, 255, 0, 0, 0, 0, 0, 0]],
		[[254, 255, 255, 255, 255, 255, 255, 255], [255, 0, 0, 0, 0, 0, 0, 0]],
	])('should not generate new nonce if counter does not overflow', (async (counterBeforeIncrease, counterAfterIncrease) => {
		jest.useFakeTimers();

		const nonce = await crypto.generateNonce(new Uint8Array(36));
		expect(nonce.subarray(-8)).toEqual(new Uint8Array(8));
		const nonCounterPart = nonce.slice(0, 28);

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array(counterBeforeIncrease), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array(counterAfterIncrease));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);
	}));

	it.each([0, 1, 0xFE, 0xFF, 0x100, 0xFFFE, 0xFFFF, 0x10000, Date.now()],
	)('should generate new nonce if counter overflow', (async (mockedTimestamp) => {
		jest.useFakeTimers({ now: mockedTimestamp });

		const nonce = await crypto.generateNonce(new Uint8Array(36));
		expect(nonce.subarray(-8)).toEqual(new Uint8Array(8));
		const nonCounterPart = nonce.slice(0, 28);
		const randomPart = nonce.slice(0, 21);
		const timestampPart = nonce.slice(21, 28);

		jest.advanceTimersByTime(1);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
		// Random part should be changed
		expect(nonce.subarray(0, 21)).not.toEqual(randomPart);
		// Timestamp part should have expected value
		let carry = 2;
		for (let i = 0; i < timestampPart.length; i++) {
			const sum = timestampPart[i] + carry;
			timestampPart[i] = sum % 256;
			carry = Math.floor(sum / 256);
			if (carry === 0) {
				break;
			}
		}
		expect(nonce.subarray(21, 28)).toEqual(timestampPart);
	}));

});
