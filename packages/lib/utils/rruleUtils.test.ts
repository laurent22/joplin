import { simpleIntervalToRRule, isRRuleString, createRRule } from './rruleUtils';

describe('rruleUtils', () => {
	const simpleIntervalDtstart = new Date('2025-01-01T09:00:00Z');
	const createRRuleDtstart = new Date('2025-06-15T10:00:00Z');

	it('simpleIntervalToRRule - should convert daily to an RRULE string', () => {
		const result = simpleIntervalToRRule('daily', simpleIntervalDtstart);
		expect(result).toContain('FREQ=DAILY');
	});

	it('simpleIntervalToRRule - should convert weekly to an RRULE string', () => {
		const result = simpleIntervalToRRule('weekly', simpleIntervalDtstart);
		expect(result).toContain('FREQ=WEEKLY');
	});

	it('simpleIntervalToRRule - should convert monthly to an RRULE string', () => {
		const result = simpleIntervalToRRule('monthly', simpleIntervalDtstart);
		expect(result).toContain('FREQ=MONTHLY');
	});

	it('simpleIntervalToRRule - should return empty string for none', () => {
		const result = simpleIntervalToRRule('none', simpleIntervalDtstart);
		expect(result).toBe('');
	});

	it('simpleIntervalToRRule - should return empty string for unknown intervals', () => {
		const result = simpleIntervalToRRule('hourly', simpleIntervalDtstart);
		expect(result).toBe('');
	});

	it('isRRuleString - should return true for FREQ-prefixed strings', () => {
		expect(isRRuleString('FREQ=DAILY;INTERVAL=1')).toBe(true);
		expect(isRRuleString('FREQ=WEEKLY;BYDAY=MO,WE')).toBe(true);
		expect(isRRuleString('FREQ=MONTHLY;BYMONTHDAY=1')).toBe(true);
	});

	it('isRRuleString - should return true for DTSTART-prefixed strings', () => {
		expect(isRRuleString('DTSTART:20250101T090000Z\nFREQ=DAILY')).toBe(true);
	});

	it('isRRuleString - should return false for simple interval strings', () => {
		expect(isRRuleString('daily')).toBe(false);
		expect(isRRuleString('weekly')).toBe(false);
		expect(isRRuleString('monthly')).toBe(false);
	});

	it('isRRuleString - should return false for none or empty', () => {
		expect(isRRuleString('none')).toBe(false);
		expect(isRRuleString('')).toBe(false);
	});

	it('createRRule - should create a daily RRULE', () => {
		const result = createRRule({ freq: 'DAILY', dtstart: createRRuleDtstart });
		expect(result).toContain('FREQ=DAILY');
	});

	it('createRRule - should create a weekly RRULE', () => {
		const result = createRRule({ freq: 'WEEKLY', dtstart: createRRuleDtstart });
		expect(result).toContain('FREQ=WEEKLY');
	});

	it('createRRule - should create a monthly RRULE', () => {
		const result = createRRule({ freq: 'MONTHLY', dtstart: createRRuleDtstart });
		expect(result).toContain('FREQ=MONTHLY');
	});

	it('createRRule - should create a yearly RRULE', () => {
		const result = createRRule({ freq: 'YEARLY', dtstart: createRRuleDtstart });
		expect(result).toContain('FREQ=YEARLY');
	});

	it('createRRule - should include INTERVAL when specified', () => {
		const result = createRRule({ freq: 'DAILY', interval: 2, dtstart: createRRuleDtstart });
		expect(result).toContain('INTERVAL=2');
	});

	it('createRRule - should include BYMONTHDAY when specified', () => {
		const result = createRRule({ freq: 'MONTHLY', bymonthday: 15, dtstart: createRRuleDtstart });
		expect(result).toContain('BYMONTHDAY=15');
	});

	it('createRRule - should return a string starting with DTSTART or FREQ', () => {
		const result = createRRule({ freq: 'WEEKLY', dtstart: createRRuleDtstart });
		expect(isRRuleString(result)).toBe(true);
	});
});
