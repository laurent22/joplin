// ==============================================================================
// 2021-12-15
// Modified for Joplin Server to use dayjs instead of moment.js
// Unfortunately it still requires the "later" library, which huge, so shouldn't
// be used for now
// ==============================================================================



// //////////////////////////////////////////////////////////////////////////////////
//
//  prettycron.js
//  Generates human-readable sentences from a schedule string in cron format
//
//  Based on an earlier version by Pehr Johansson
//  http://dsysadm.blogspot.com.au/2012/09/human-readable-cron-expressions-using.html
//
// //////////////////////////////////////////////////////////////////////////////////
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Lesser General Public License as published
//  by the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Lesser General Public License for more details.
//
//  You should have received a copy of the GNU Lesser General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
// //////////////////////////////////////////////////////////////////////////////////

const dayjs = require('dayjs');
const advancedFormat = require('dayjs/plugin/advancedFormat');
const calendar = require('dayjs/plugin/calendar');
dayjs.extend(advancedFormat);
dayjs.extend(calendar);

const later = require('later');

(function() {

	const ordinal = {

		ordinalSuffix(num: number) {
			const ordinalsArray = ['th', 'st', 'nd', 'rd'];

			// Get reminder of number by hundred so that we can counter number between 11-19
			const offset = num % 100;

			// Calculate position of ordinal to be used. Logic : Array index is calculated based on defined values.
			const ordinalPos = ordinalsArray[ (offset - 20) % 10 ] || ordinalsArray[ offset ] || ordinalsArray[0];

			// Return suffix
			return ordinalPos;
		},

		toOrdinal(num: number) {

			// Check if number is valid
			// if( !validateNumber(num) ) {
			// 	return `${num} is not a valid number`;
			// }

			// If number is zero no need to spend time on calculation
			if (num === 0) {
				return num.toString();
			}

			return num.toString() + this.ordinalSuffix(num);
		},
	};

	// For an array of numbers, e.g. a list of hours in a schedule,
	// return a string listing out all of the values (complete with
	// "and" plus ordinal text on the last item).
	const numberList = function(numbers: any[]) {
		if (numbers.length < 2) {
			return ordinal.toOrdinal(numbers[0]);
		}

		const last_val = numbers.pop();
		return `${numbers.join(', ')} and ${ordinal.toOrdinal(last_val)}`;
	};

	const stepSize = function(numbers: any[]) {
		if (!numbers || numbers.length <= 1) return 0;

		const expectedStep = numbers[1] - numbers[0];
		if (numbers.length === 2) return expectedStep;

		// Check that every number is the previous number + the first number
		return numbers.slice(1).every((n, i, a) => {
			return (i === 0 ? n : n - a[i - 1]) === expectedStep;
		}) ? expectedStep : 0;
	};

	const isEveryOther = function(stepsize: number, numbers: any[]) {
		return numbers.length === 30 && stepsize === 2;
	};
	const isTwicePerHour = function(stepsize: number, numbers: any[]) {
		return numbers.length === 2 && stepsize === 30;
	};
	const isOnTheHour = function(numbers: any[]) {
		return numbers.length === 1 && numbers[0] === 0;
	};
	const isStepValue = function(stepsize: number, numbers: any[]) {
		// Value with slash (https://en.wikipedia.org/wiki/Cron#Non-Standard_Characters)
		return numbers.length > 2 && stepsize > 0;
	};
	// For an array of numbers of seconds, return a string
	// listing all the values unless they represent a frequency divisible by 60:
	// /2, /3, /4, /5, /6, /10, /12, /15, /20 and /30
	const getMinutesTextParts = function(numbers: any[]) {
		const stepsize = stepSize(numbers);
		if (!numbers) {
			return { beginning: 'minute', text: '' };
		}

		const minutes = { beginning: '', text: '' };
		if (isOnTheHour(numbers)) {
			minutes.text = 'hour, on the hour';
		} else if (isEveryOther(stepsize, numbers)) {
			minutes.beginning = 'other minute';
		} else if (isStepValue(stepsize, numbers)) {
			minutes.text = `${stepsize} minutes`;
		} else if (isTwicePerHour(stepsize, numbers)) {
			minutes.text = 'first and 30th minute';
		} else {
			minutes.text = `${numberList(numbers)} minute`;
		}
		return minutes;
	};
	// For an array of numbers of seconds, return a string
	// listing all the values unless they represent a frequency divisible by 60:
	// /2, /3, /4, /5, /6, /10, /12, /15, /20 and /30
	const getSecondsTextParts = function(numbers: any[]) {
		const stepsize = stepSize(numbers);
		if (!numbers) {
			return { beginning: 'second', text: '' };
		}
		if (isEveryOther(stepsize, numbers)) {
			return { beginning: '', text: 'other second' };
		} else if (isStepValue(stepsize, numbers)) {
			return { beginning: '', text: `${stepsize} seconds` };
		} else {
			return { beginning: 'minute', text: `starting on the ${numbers.length === 2 && stepsize === 30 ? 'first and 30th second' : `${numberList(numbers)} second`}` };
		}
	};

	// Parse a number into day of week, or a month name;
	// used in dateList below.
	const numberToDateName = function(value: any, type: any) {
		if (type === 'dow') {
			return dayjs().day(value - 1).format('ddd');
		} else if (type === 'mon') {
			return dayjs().month(value - 1).format('MMM');
		}
	};

	// From an array of numbers corresponding to dates (given in type: either
	// days of the week, or months), return a string listing all the values.
	const dateList = function(numbers: any[], type: any) {
		if (numbers.length < 2) {
			return numberToDateName(`${numbers[0]}`, type);
		}

		const last_val = `${numbers.pop()}`;
		const output_text = '';

		// No idea what is this nonsense so comenting it out for now.

		// for (let i = 0, value; value = numbers[i]; i++) {
		// 	if (output_text.length > 0) {
		// 		output_text += ', ';
		// 	}
		// 	output_text += numberToDateName(value, type);
		// }
		return `${output_text} and ${numberToDateName(last_val, type)}`;
	};

	// Pad to equivalent of sprintf('%02d'). Both moment.js and later.js
	// have zero-fill functions, but alas, they're private.
	// let zeroPad = function(x:any) {
	//   return (x < 10) ? '0' + x : x;
	// };

	const removeFromSchedule = function(schedule: any, member: any, length: any) {
		if (schedule[member] && schedule[member].length === length) {
			delete schedule[member];
		}
	};

	// ----------------

	// Given a schedule from later.js (i.e. after parsing the cronspec),
	// generate a friendly sentence description.
	const scheduleToSentence = function(schedule: any, useSeconds: boolean) {
		let textParts = [];

		// A later.js schedules contains no member for time units where an asterisk is used,
		// but schedules that means the same (e.g 0/1 is essentially the same as *) are
		// returned with populated members.
		// Remove all members that are fully populated to reduce complexity of code
		removeFromSchedule(schedule, 'M', 12);
		removeFromSchedule(schedule, 'D', 31);
		removeFromSchedule(schedule, 'd', 7);
		removeFromSchedule(schedule, 'h', 24);
		removeFromSchedule(schedule, 'm', 60);
		removeFromSchedule(schedule, 's', 60);

		//   let everySecond = useSeconds && schedule['s'] === undefined;
		// 	let  everyMinute = schedule['m'] === undefined;
		// 	let  everyHour = schedule['h'] === undefined;
		const everyWeekday = schedule['d'] === undefined;
		const everyDayInMonth = schedule['D'] === undefined;
		// let  everyMonth = schedule['M'] === undefined;

		const oneOrTwoSecondsPerMinute = schedule['s'] && schedule['s'].length <= 2;
		const oneOrTwoMinutesPerHour = schedule['m'] && schedule['m'].length <= 2;
		const oneOrTwoHoursPerDay = schedule['h'] && schedule['h'].length <= 2;
		const onlySpecificDaysOfMonth = schedule['D'] && schedule['D'].length !== 31;
		if (oneOrTwoHoursPerDay && oneOrTwoMinutesPerHour && oneOrTwoSecondsPerMinute) {
		// If there are only one or two specified values for
		// hour or minute, print them in HH:MM format, or HH:MM:ss if seconds are used
		// If seconds are not used, later.js returns one element for the seconds (set to zero)

			const hm = [];
			// let m = dayjs(new Date());
			for (let i = 0; i < schedule['h'].length; i++) {
				for (let j = 0; j < schedule['m'].length; j++) {
					for (let k = 0; k < schedule['s'].length; k++) {

						const s = dayjs()
							.hour(schedule['h'][i])
							.minute(schedule['m'][j])
							.second(schedule['s'][k])
							.format(useSeconds ? 'HH:mm:ss' : 'HH:mm');

						hm.push(s);

						// m.hour(schedule['h'][i]);
						// m.minute(schedule['m'][j]);
						// m.second(schedule['s'][k]);
						// hm.push(m.format( useSeconds ? 'HH:mm:ss' : 'HH:mm'));
					}
				}
			}
			if (hm.length < 2) {
				textParts.push(hm[0]);
			} else {
				const last_val = hm.pop();
				textParts.push(`${hm.join(', ')} and ${last_val}`);
			}
			if (everyWeekday && everyDayInMonth) {
				textParts.push('every day');
			}

		} else {
			const seconds = getSecondsTextParts(schedule['s']);
			const minutes = getMinutesTextParts(schedule['m']);
			let beginning = '';
			let end = '';

			textParts.push('Every');

			// Otherwise, list out every specified hour/minute value.
			const hasSpecificSeconds = schedule['s'] && (
				schedule['s'].length > 1 && schedule['s'].length < 60 ||
			schedule['s'].length === 1 && schedule['s'][0] !== 0);
			if (hasSpecificSeconds) {
				beginning = seconds.beginning;
				end = seconds.text;
			}

			if (schedule['h']) { // runs only at specific hours
				if (hasSpecificSeconds) {
					end += ' on the ';
				}
				if (schedule['m']) { // and only at specific minutes
					const hours = `${numberList(schedule['h'])} hour`;
					if (!hasSpecificSeconds && isOnTheHour(schedule['m'])) {
						textParts = ['On the'];
						end += hours;
					} else {
						beginning = minutes.beginning;
						end += `${minutes.text} past the ${hours}`;
					}
				} else { // specific hours, but every minute
					end += `minute of ${numberList(schedule['h'])} hour`;
				}
			} else if (schedule['m']) { // every hour, but specific minutes
				beginning = minutes.beginning;
				end += minutes.text;
				if (!isOnTheHour(schedule['m']) && (onlySpecificDaysOfMonth || schedule['d'] || schedule['M'])) {
					end += ' past every hour';
				}
			} else if (!schedule['s'] && !schedule['m']) {
				beginning = seconds.beginning;
			} else if (!useSeconds || !hasSpecificSeconds) { // cronspec has "*" for both hour and minute
				beginning += minutes.beginning;
			}
			textParts.push(beginning);
			textParts.push(end);
		}

		if (onlySpecificDaysOfMonth) { // runs only on specific day(s) of month
			textParts.push(`on the ${numberList(schedule['D'])}`);
			if (!schedule['M']) {
				textParts.push('of every month');
			}
		}

		if (schedule['d']) { // runs only on specific day(s) of week
			if (schedule['D']) {
			// if both day fields are specified, cron uses both; superuser.com/a/348372
				textParts.push('and every');
			} else {
				textParts.push('on');
			}
			textParts.push(dateList(schedule['d'], 'dow'));
		}

		if (schedule['M']) {
			if (schedule['M'].length === 12) {
				textParts.push('day of every month');
			} else {
			// runs only in specific months; put this output last
				textParts.push(`in ${dateList(schedule['M'], 'mon')}`);
			}
		}

		return textParts.filter((p) => { return p; }).join(' ');
	};

	// ----------------

	// Given a cronspec, return the human-readable string.
	const toString = function(cronspec: any, sixth: boolean) {
		const schedule = later.parse.cron(cronspec, sixth);
		return scheduleToSentence(schedule['schedules'][0], sixth);
	};

	// Given a cronspec, return the next date for when it will next run.
	// (This is just a wrapper for later.js)
	const getNextDate = function(cronspec: any, sixth: boolean) {
		later.date.localTime();
		const schedule = later.parse.cron(cronspec, sixth);
		return later.schedule(schedule).next();
	};

	// Given a cronspec, return a friendly string for when it will next run.
	// (This is just a wrapper for later.js and moment.js)
	const getNext = function(cronspec: any, sixth: boolean) {
		return dayjs(getNextDate(cronspec, sixth)).calendar();
	};

	// Given a cronspec and numDates, return a list of formatted dates
	// of the next set of runs.
	// (This is just a wrapper for later.js and moment.js)
	const getNextDates = function(cronspec: any, numDates: any, sixth: boolean) {
		const schedule = later.parse.cron(cronspec, sixth);
		const nextDates = later.schedule(schedule).next(numDates);

		const nextPrettyDates = [];
		for (let i = 0; i < nextDates.length; i++) {
			nextPrettyDates.push(dayjs(nextDates[i]).calendar());
		}

		return nextPrettyDates;
	};

	// ----------------

	// attach ourselves to window in the browser, and to exports in Node,
	// so our functions can always be called as prettyCron.toString()
	const global_obj = (typeof exports !== 'undefined' && exports !== null) ? exports : (window as any).prettyCron = {};

	global_obj.toString = toString;
	global_obj.getNext = getNext;
	global_obj.getNextDate = getNextDate;
	global_obj.getNextDates = getNextDates;

}).call(this);
