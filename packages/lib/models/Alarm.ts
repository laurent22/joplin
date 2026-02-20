import BaseModel from '../BaseModel';
import Note from './Note';
import { RRule } from 'rrule';

export interface Notification {
	id: number;
	noteId: string;
	date: Date;
	title: string;
	body?: string;
}

// Alarm model with support for recurring notifications using RRULE (RFC 5545)
//
// Supports both simple intervals (backward compatible) and RRULE strings:
//
// Simple intervals (converted to RRULE automatically):
// - 'daily'   → Daily recurrence
// - 'weekly'  → Weekly recurrence
// - 'monthly' → Monthly recurrence
// - 'none'    → One-time alarm
//
// RRULE examples:
// - 'FREQ=DAILY;INTERVAL=1'                    → Every day
// - 'FREQ=WEEKLY;BYDAY=MO,WE,FR'               → Every Mon, Wed, Fri
// - 'FREQ=MONTHLY;BYMONTHDAY=1'                → First day of each month
// - 'FREQ=MONTHLY;BYDAY=1MO'                   → First Monday of each month
// - 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25'     → Every Christmas
//
// Use createRRule() helper for building custom RRULE patterns
export default class Alarm extends BaseModel {
	public static tableName() {
		return 'alarms';
	}

	public static modelType() {
		return BaseModel.TYPE_ALARM;
	}

	public static byNoteId(noteId: string) {
		return this.modelSelectOne('SELECT * FROM alarms WHERE note_id = ?', [noteId]);
	}

	public static async deleteExpiredAlarms() {
		return this.db().exec('DELETE FROM alarms WHERE trigger_time <= ?', [Date.now()]);
	}

	public static async alarmIdsWithoutNotes() {
		// https://stackoverflow.com/a/4967229/561309
		const alarms = await this.db().selectAll('SELECT alarms.id FROM alarms LEFT JOIN notes ON alarms.note_id = notes.id WHERE notes.id IS NULL');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return alarms.map((a: any) => {
			return a.id;
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async makeNotification(alarm: any, note: any = null): Promise<Notification> {
		if (!note) {
			note = await Note.load(alarm.note_id);
		} else if (!note.todo_due) {
			this.logger().warn('Trying to create notification for note with todo_due property - reloading note object in case we are dealing with a partial note');
			note = await Note.load(alarm.note_id);
			this.logger().warn('Reloaded note:', note);
		}

		// Calculate trigger time based on repeat interval
		let triggerDate = new Date(alarm.trigger_time);

		// If this is a repeating alarm and should trigger
		if (alarm.repeat_interval && alarm.repeat_interval !== 'none') {
			if (this.shouldTriggerAlarm(alarm)) {
				// Use current trigger time
				triggerDate = new Date(alarm.trigger_time);
			} else {
				// Calculate next trigger time
				const nextTrigger = this.calculateNextTriggerTime(alarm.trigger_time, alarm.repeat_interval);
				triggerDate = new Date(nextTrigger);
			}
		}

		const output: Notification = {
			id: alarm.id,
			noteId: alarm.note_id,
			date: triggerDate,
			title: note.title.substr(0, 128),
		};

		if (note.body) output.body = note.body.substr(0, 512);

		return output;
	}

	public static async allDue() {
		return this.modelSelectAll('SELECT * FROM alarms WHERE trigger_time >= ?', [Date.now()]);
	}

	// Convert simple interval strings to RRULE strings for backward compatibility
	private static simpleIntervalToRRule(period: string, dtstart: Date): string {
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
	private static isRRuleString(interval: string): boolean {
		if (!interval || interval === 'none') return false;
		return interval.startsWith('DTSTART') || interval.startsWith('FREQ');
	}

	// Check if alarm should trigger based on repeat_interval and last_trigger_time
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static shouldTriggerAlarm(alarm: any): boolean {
		// If no repeat interval, it's a one-time alarm
		if (!alarm.repeat_interval || alarm.repeat_interval === 'none') {
			return true;
		}

		const now = Date.now();

		// First time trigger - no last_trigger_time set
		if (!alarm.last_trigger_time || alarm.last_trigger_time === 0) {
			return true;
		}

		// Calculate next occurrence and check if it's due
		try {
			const nextTrigger = this.calculateNextTriggerTime(alarm.last_trigger_time, alarm.repeat_interval);
			return now >= nextTrigger;
		} catch (error) {
			this.logger().error('Error checking if alarm should trigger:', error);
			return true; // Default to triggering on error
		}
	}

	// Update the last_trigger_time for a repeating alarm
	public static async updateLastTriggered(alarmId: number): Promise<void> {
		const now = Date.now();
		await this.db().exec(
			'UPDATE alarms SET last_trigger_time = ? WHERE id = ?',
			[now, alarmId],
		);
	}

	// Delete only non-repeating expired alarms
	public static async deleteExpiredNonRepeatingAlarms() {
		return this.db().exec(
			'DELETE FROM alarms WHERE trigger_time <= ? AND (repeat_interval IS NULL OR repeat_interval = "none")',
			[Date.now()],
		);
	}

	// Calculate next trigger time for repeating alarms using RRULE
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static calculateNextTriggerTime(currentTriggerTime: number, repeatInterval: string): number {
		if (!repeatInterval || repeatInterval === 'none') {
			return currentTriggerTime;
		}

		try {
			const currentDate = new Date(currentTriggerTime);
			let rruleString = repeatInterval;

			// Convert simple interval to RRULE if needed (backward compatibility)
			if (!this.isRRuleString(repeatInterval)) {
				rruleString = this.simpleIntervalToRRule(repeatInterval, currentDate);
				if (!rruleString) return currentTriggerTime;
			}

			// Parse RRULE and get next occurrence after current time
			const rule = RRule.fromString(rruleString);
			const nextDate = rule.after(currentDate, false); // false = exclusive (after current)

			if (!nextDate) {
				this.logger().warn(`No next occurrence found for RRULE: ${rruleString}`);
				return currentTriggerTime;
			}

			return nextDate.getTime();
		} catch (error) {
			this.logger().error(`Error calculating next trigger time for interval "${repeatInterval}":`, error);
			return currentTriggerTime;
		}
	}

	// Helper to create RRULE string from common patterns
	public static createRRule(options: {
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
}
