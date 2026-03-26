import { nextOccurrence, RecurrenceInterval, recurrenceLabel, allRecurrenceIntervals } from './recurrence';

describe('recurrence', () => {

	describe('nextOccurrence', () => {

		it('should return 0 for None interval', () => {
			const now = new Date(2026, 2, 15, 10, 0, 0).getTime(); // March 15, 2026 10:00
			expect(nextOccurrence(now, RecurrenceInterval.None)).toBe(0);
		});

		it('should return 0 for empty string interval', () => {
			const now = new Date(2026, 2, 15, 10, 0, 0).getTime();
			expect(nextOccurrence(now, '' as RecurrenceInterval)).toBe(0);
		});

		it('should advance by 1 day for Daily', () => {
			const base = new Date(2026, 2, 15, 10, 30, 0).getTime(); // March 15, 2026 10:30
			const next = nextOccurrence(base, RecurrenceInterval.Daily);
			const nextDate = new Date(next);
			expect(nextDate.getDate()).toBe(16);
			expect(nextDate.getMonth()).toBe(2); // March
			expect(nextDate.getHours()).toBe(10);
			expect(nextDate.getMinutes()).toBe(30);
		});

		it('should advance by 7 days for Weekly', () => {
			const base = new Date(2026, 2, 15, 9, 0, 0).getTime(); // March 15, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Weekly);
			const nextDate = new Date(next);
			expect(nextDate.getDate()).toBe(22);
			expect(nextDate.getMonth()).toBe(2); // March
		});

		it('should advance by 1 month for Monthly', () => {
			const base = new Date(2026, 0, 15, 10, 0, 0).getTime(); // Jan 15, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Monthly);
			const nextDate = new Date(next);
			expect(nextDate.getDate()).toBe(15);
			expect(nextDate.getMonth()).toBe(1); // February
		});

		it('should handle month-end edge case: Jan 31 -> Feb 28', () => {
			const base = new Date(2026, 0, 31, 10, 0, 0).getTime(); // Jan 31, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Monthly);
			const nextDate = new Date(next);
			expect(nextDate.getMonth()).toBe(1); // February
			expect(nextDate.getDate()).toBe(28); // 2026 is not a leap year
		});

		it('should handle month-end edge case: Jan 31 -> Feb 29 in leap year', () => {
			const base = new Date(2028, 0, 31, 10, 0, 0).getTime(); // Jan 31, 2028 (leap year)
			const next = nextOccurrence(base, RecurrenceInterval.Monthly);
			const nextDate = new Date(next);
			expect(nextDate.getMonth()).toBe(1); // February
			expect(nextDate.getDate()).toBe(29);
		});

		it('should advance by 1 year for Yearly', () => {
			const base = new Date(2026, 5, 15, 10, 0, 0).getTime(); // June 15, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Yearly);
			const nextDate = new Date(next);
			expect(nextDate.getFullYear()).toBe(2027);
			expect(nextDate.getMonth()).toBe(5); // June
			expect(nextDate.getDate()).toBe(15);
		});

		it('should handle leap year edge case: Feb 29 -> Feb 28', () => {
			const base = new Date(2028, 1, 29, 10, 0, 0).getTime(); // Feb 29, 2028 (leap year)
			const next = nextOccurrence(base, RecurrenceInterval.Yearly);
			const nextDate = new Date(next);
			expect(nextDate.getFullYear()).toBe(2029);
			expect(nextDate.getMonth()).toBe(1); // February
			expect(nextDate.getDate()).toBe(28);
		});

		it('should cross month boundary for Daily at end of month', () => {
			const base = new Date(2026, 2, 31, 10, 0, 0).getTime(); // March 31, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Daily);
			const nextDate = new Date(next);
			expect(nextDate.getMonth()).toBe(3); // April
			expect(nextDate.getDate()).toBe(1);
		});

		it('should cross year boundary for Weekly', () => {
			const base = new Date(2026, 11, 28, 10, 0, 0).getTime(); // Dec 28, 2026
			const next = nextOccurrence(base, RecurrenceInterval.Weekly);
			const nextDate = new Date(next);
			expect(nextDate.getFullYear()).toBe(2027);
			expect(nextDate.getMonth()).toBe(0); // January
			expect(nextDate.getDate()).toBe(4);
		});

		it('should return 0 for zero timestamp', () => {
			expect(nextOccurrence(0, RecurrenceInterval.Daily)).toBe(0);
		});

		it('should return 0 for negative timestamp', () => {
			expect(nextOccurrence(-1000, RecurrenceInterval.Daily)).toBe(0);
		});

		it('should return 0 for unknown/garbage interval string', () => {
			expect(nextOccurrence(Date.now(), 'biweekly' as RecurrenceInterval)).toBe(0);
		});

		it('should handle sequential monthly recurrence across short months', () => {
			// Mar 31 -> Apr 30 (April has 30 days) -> May 30 (stays at 30, not back to 31)
			const mar31 = new Date(2026, 2, 31, 10, 0, 0).getTime();
			const apr = nextOccurrence(mar31, RecurrenceInterval.Monthly);
			const aprDate = new Date(apr);
			expect(aprDate.getMonth()).toBe(3); // April
			expect(aprDate.getDate()).toBe(30); // April has 30 days

			const may = nextOccurrence(apr, RecurrenceInterval.Monthly);
			const mayDate = new Date(may);
			expect(mayDate.getMonth()).toBe(4); // May
			expect(mayDate.getDate()).toBe(30); // Stays at 30, doesn't jump back to 31
		});

		it('should preserve exact time (hours, minutes, seconds) across all intervals', () => {
			const base = new Date(2026, 5, 15, 14, 45, 30).getTime(); // 2:45:30 PM
			for (const interval of [RecurrenceInterval.Daily, RecurrenceInterval.Weekly, RecurrenceInterval.Monthly, RecurrenceInterval.Yearly]) {
				const next = nextOccurrence(base, interval);
				const nextDate = new Date(next);
				expect(nextDate.getHours()).toBe(14);
				expect(nextDate.getMinutes()).toBe(45);
				expect(nextDate.getSeconds()).toBe(30);
			}
		});

		it('should support fast-forward pattern (repeatedly calling nextOccurrence)', () => {
			// Simulate: alarm was daily at 9AM, app was closed for 5 days
			const original = new Date(2026, 2, 10, 9, 0, 0).getTime(); // March 10
			const now = new Date(2026, 2, 15, 12, 0, 0).getTime(); // March 15, noon

			let due = nextOccurrence(original, RecurrenceInterval.Daily);
			while (due && due <= now) {
				due = nextOccurrence(due, RecurrenceInterval.Daily);
			}

			const dueDate = new Date(due);
			expect(dueDate.getMonth()).toBe(2); // March
			expect(dueDate.getDate()).toBe(16); // Next future occurrence after March 15 noon
			expect(dueDate.getHours()).toBe(9); // Preserves 9 AM
		});
	});

	describe('recurrenceLabel', () => {
		it('should return labels for all intervals', () => {
			expect(recurrenceLabel(RecurrenceInterval.None)).toBeTruthy();
			expect(recurrenceLabel(RecurrenceInterval.Daily)).toBeTruthy();
			expect(recurrenceLabel(RecurrenceInterval.Weekly)).toBeTruthy();
			expect(recurrenceLabel(RecurrenceInterval.Monthly)).toBeTruthy();
			expect(recurrenceLabel(RecurrenceInterval.Yearly)).toBeTruthy();
		});
	});

	describe('allRecurrenceIntervals', () => {
		it('should return all 5 intervals', () => {
			const intervals = allRecurrenceIntervals();
			expect(intervals).toHaveLength(5);
			expect(intervals).toContain(RecurrenceInterval.None);
			expect(intervals).toContain(RecurrenceInterval.Daily);
		});
	});
});
