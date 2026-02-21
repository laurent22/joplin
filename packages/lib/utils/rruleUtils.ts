import { RRule } from 'rrule';

// Convert simple interval strings to RRULE strings for backward compatibility
export function simpleIntervalToRRule(period: string, dtstart: Date): string {
	switch (period) {
	case 'daily':
		return new RRule({
			freq: RRule.DAILY,
			dtstart,
		}).toString();
	case 'weekly':
		return new RRule({
			freq: RRule.WEEKLY,
			dtstart,
		}).toString();
	case 'monthly':
		return new RRule({
			freq: RRule.MONTHLY,
			dtstart,
		}).toString();
	case 'none':
	default:
		return '';
	}
}

// Check if repeat_interval is a simple string or RRULE
export function isRRuleString(interval: string): boolean {
	if (!interval || interval === 'none') return false;
	return interval.startsWith('DTSTART') || interval.startsWith('FREQ');
}

// Helper to create RRULE string from common patterns
export function createRRule(options: {
	freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
	interval?: number;
	byweekday?: number[];
	bymonthday?: number;
	dtstart: Date;
}): string {
	const freqMap: Record<string, number> = {
		DAILY: RRule.DAILY,
		WEEKLY: RRule.WEEKLY,
		MONTHLY: RRule.MONTHLY,
		YEARLY: RRule.YEARLY,
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rruleOptions: any = {
		freq: freqMap[options.freq],
		dtstart: options.dtstart,
	};

	if (options.interval) rruleOptions.interval = options.interval;
	if (options.byweekday) rruleOptions.byweekday = options.byweekday;
	if (options.bymonthday) rruleOptions.bymonthday = options.bymonthday;

	return new RRule(rruleOptions).toString();
}
