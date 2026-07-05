import { mapErrorByCode } from './JoplinCloud';

describe('JoplinCloud provider', () => {

	test.each([
		['aiRateLimitExceeded', /sending requests too quickly/i],
		['aiBudgetExhausted', /reached your AI usage budget/i],
		['aiAccountDisabled', /disabled for your account/i],
		['aiUpstreamError', /temporarily unavailable/i],
	])('maps server code %s to a user-facing message', (code, pattern) => {
		const error = mapErrorByCode(code, 0, '');
		expect(error.code).toBe(code);
		expect(error.message).toMatch(pattern);
	});

	it('falls back to sign-in message on 401 with no code', () => {
		const error = mapErrorByCode(null, 401, 'Unauthorized');
		expect(error.code).toBe(401);
		expect(error.message).toMatch(/sign in/i);
	});

	it('falls back to not-enabled message on 501 with no code', () => {
		const error = mapErrorByCode(null, 501, '');
		expect(error.code).toBe(501);
		expect(error.message).toMatch(/not enabled/i);
	});

	it('falls back to generic status message for unmatched code and status', () => {
		const error = mapErrorByCode(null, 503, 'oops');
		expect(error.code).toBe(503);
		expect(error.message).toMatch(/503/);
		expect(error.message).toMatch(/oops/);
	});

	it('preserves an unknown string code in both message and error.code', () => {
		// Future-proofing: server may add a new code before this client knows
		// about it. The raw code must remain diagnosable in logs and to any
		// caller that switches on error.code.
		const error = mapErrorByCode('aiSomeNewThing', 0, 'unknown thing happened');
		expect(error.code).toBe('aiSomeNewThing');
		expect(error.message).toMatch(/aiSomeNewThing/);
		expect(error.message).toMatch(/unknown thing happened/);
	});

	it('code wins over status', () => {
		// A 429 that also carries aiBudgetExhausted must produce the budget
		// message, not a generic 429 message.
		const error = mapErrorByCode('aiBudgetExhausted', 429, 'ignored');
		expect(error.code).toBe('aiBudgetExhausted');
		expect(error.message).toMatch(/reached your AI usage budget/i);
	});
});
