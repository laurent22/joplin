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

	it('should not generate new nonce if counter does not overflow', (async () => {
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

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array([248, 249, 250, 251, 252, 253, 254, 255]), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([248, 249, 250, 251, 252, 253, 255, 0]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array([249, 250, 251, 252, 253, 254, 255, 255]), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([249, 250, 251, 252, 253, 255, 0, 0]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array([253, 254, 255, 255, 255, 255, 255, 255]), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([253, 255, 0, 0, 0, 0, 0, 0]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);

		jest.advanceTimersByTime(1);
		nonce.set(new Uint8Array([254, 255, 255, 255, 255, 255, 255, 255]), 28);
		await crypto.increaseNonce(nonce);
		// Counter should have expected value
		expect(nonce.subarray(-8)).toEqual(new Uint8Array([255, 0, 0, 0, 0, 0, 0, 0]));
		// Non-counter part should stay the same
		expect(nonce.subarray(0, 28)).toEqual(nonCounterPart);
	}));

	it('should generate new nonce if counter overflow', (async () => {
		jest.useFakeTimers();

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
		expect(nonce[21]).toBe(timestampPart[0] + 2);
		expect(nonce.subarray(22, 28)).toEqual(timestampPart.subarray(1));
	}));

});
