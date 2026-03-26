import { _ } from '../locale';

export enum RecurrenceInterval {
	None = '',
	Daily = 'daily',
	Weekly = 'weekly',
	Monthly = 'monthly',
	Yearly = 'yearly',
}

/**
 * Computes the next alarm occurrence given a base timestamp and a recurrence interval.
 * Returns 0 if interval is None.
 */
export function nextOccurrence(fromDateMs: number, interval: RecurrenceInterval): number {
	if (!interval || (interval as string) === RecurrenceInterval.None) return 0;
	if (!fromDateMs || fromDateMs <= 0) return 0;

	const date = new Date(fromDateMs);

	switch (interval) {
		case RecurrenceInterval.Daily:
			date.setDate(date.getDate() + 1);
			break;
		case RecurrenceInterval.Weekly:
			date.setDate(date.getDate() + 7);
			break;
		case RecurrenceInterval.Monthly: {
			const originalDay = date.getDate();
			date.setMonth(date.getMonth() + 1);
			// Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
			if (date.getDate() !== originalDay) {
				// setMonth overflowed into the next month, so go back to last day of target month
				date.setDate(0);
			}
			break;
		}
		case RecurrenceInterval.Yearly: {
			const originalDay = date.getDate();
			date.setFullYear(date.getFullYear() + 1);
			// Handle leap year edge case (Feb 29 -> Feb 28)
			if (date.getDate() !== originalDay) {
				date.setDate(0);
			}
			break;
		}
		default:
			return 0;
	}

	return date.getTime();
}

/**
 * Returns a localized display label for a recurrence interval.
 */
export function recurrenceLabel(interval: RecurrenceInterval): string {
	switch (interval) {
		case RecurrenceInterval.None: return _('None');
		case RecurrenceInterval.Daily: return _('Daily');
		case RecurrenceInterval.Weekly: return _('Weekly');
		case RecurrenceInterval.Monthly: return _('Monthly');
		case RecurrenceInterval.Yearly: return _('Yearly');
		default: return _('None');
	}
}

/**
 * Returns all available recurrence intervals for UI pickers.
 */
export function allRecurrenceIntervals(): RecurrenceInterval[] {
	return [
		RecurrenceInterval.None,
		RecurrenceInterval.Daily,
		RecurrenceInterval.Weekly,
		RecurrenceInterval.Monthly,
		RecurrenceInterval.Yearly,
	];
}
