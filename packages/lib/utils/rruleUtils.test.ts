import { simpleIntervalToRRule, isRRuleString, createRRule } from './rruleUtils';

describe('rruleUtils', () => {
	describe('simpleIntervalToRRule', () => {
		const dtstart = new Date('2025-01-01T09:00:00Z');

		it('should convert daily to an RRULE string', () => {
			const result = simpleIntervalToRRule('daily', dtstart);
			expect(result).toContain('FREQ=DAILY');
		});

		it('should convert weekly to an RRULE string', () => {
			const result = simpleIntervalToRRule('weekly', dtstart);
			expect(result).toContain('FREQ=WEEKLY');
		});

		it('should convert monthly to an RRULE string', () => {
			const result = simpleIntervalToRRule('monthly', dtstart);
			expect(result).toContain('FREQ=MONTHLY');
		});

		it('should return empty string for none', () => {
			const result = simpleIntervalToRRule('none', dtstart);
			expect(result).toBe('');
		});

		it('should return empty string for unknown intervals', () => {
			const result = simpleIntervalToRRule('hourly', dtstart);
			expect(result).toBe('');
		});
	});

	describe('isRRuleString', () => {
		it('should return true for FREQ-prefixed strings', () => {
			expect(isRRuleString('FREQ=DAILY;INTERVAL=1')).toBe(true);
			expect(isRRuleString('FREQ=WEEKLY;BYDAY=MO,WE')).toBe(true);
			expect(isRRuleString('FREQ=MONTHLY;BYMONTHDAY=1')).toBe(true);
		});

		it('should return true for DTSTART-prefixed strings', () => {
			expect(isRRuleString('DTSTART:20250101T090000Z\nFREQ=DAILY')).toBe(true);
		});

		it('should return false for simple interval strings', () => {
			expect(isRRuleString('daily')).toBe(false);
			expect(isRRuleString('weekly')).toBe(false);
			expect(isRRuleString('monthly')).toBe(false);
		});

		it('should return false for none or empty', () => {
			expect(isRRuleString('none')).toBe(false);
			expect(isRRuleString('')).toBe(false);
		});
	});

	describe('createRRule', () => {
		const dtstart = new Date('2025-06-15T10:00:00Z');

		it('should create a daily RRULE', () => {
			const result = createRRule({ freq: 'DAILY', dtstart });
			expect(result).toContain('FREQ=DAILY');
		});

		it('should create a weekly RRULE', () => {
			const result = createRRule({ freq: 'WEEKLY', dtstart });
			expect(result).toContain('FREQ=WEEKLY');
		});

		it('should create a monthly RRULE', () => {
			const result = createRRule({ freq: 'MONTHLY', dtstart });
			expect(result).toContain('FREQ=MONTHLY');
		});

		it('should create a yearly RRULE', () => {
			const result = createRRule({ freq: 'YEARLY', dtstart });
			expect(result).toContain('FREQ=YEARLY');
		});

		it('should include INTERVAL when specified', () => {
			const result = createRRule({ freq: 'DAILY', interval: 2, dtstart });
			expect(result).toContain('INTERVAL=2');
		});

		it('should include BYMONTHDAY when specified', () => {
			const result = createRRule({ freq: 'MONTHLY', bymonthday: 15, dtstart });
			expect(result).toContain('BYMONTHDAY=15');
		});

		it('should return a string starting with DTSTART or FREQ', () => {
			const result = createRRule({ freq: 'WEEKLY', dtstart });
			expect(isRRuleString(result)).toBe(true);
		});
	});
});
