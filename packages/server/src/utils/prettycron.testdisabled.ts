// const prettycron = require('./prettycron');

// describe('prettycron', function() {

// 	it('should check if an item is encrypted', async function() {
// 		const testCases = [
// 			{ cron: '0 * * * *', readable: 'Every hour, on the hour', sixth: false },
// 			{ cron: '30 * * * 1', readable: 'Every 30th minute past every hour on Mon', sixth: false },
// 			{ cron: '15,45 9,21 * * *', readable: '09:15, 09:45, 21:15 and 21:45 every day', sixth: false },
// 			{ cron: '18,19 7 5 * *', readable: '07:18 and 07:19 on the 5th of every month', sixth: false },
// 			{ cron: '* * 25 12 *', readable: 'Every minute on the 25th in Dec', sixth: false },
// 			{ cron: '0 * 1,3 * *', readable: 'Every hour, on the hour on the 1 and 3rd of every month', sixth: false },
// 			{ cron: '0 17 * 1,4,7,10 *', readable: '17:00 every day in Jan, Apr, Jul and Oct', sixth: false },
// 			{ cron: '15 * * * 1,2', readable: 'Every 15th minute past every hour on Mon and Tue', sixth: false },
// 			{ cron: '* 8,10,12,14,16,18,20 * * *', readable: 'Every minute of 8, 10, 12, 14, 16, 18 and 20th hour', sixth: false },
// 			{ cron: '0 12 15,16 1 3', readable: '12:00 on the 15 and 16th and every Wed in Jan', sixth: false },
// 			{ cron: '0 4,8,12,4 * * 4,5,6', readable: 'On the 4, 8 and 12th hour on Thu, Fri and Sat', sixth: false },
// 			{ cron: '0 2,16 1,8,15,22 * 1,2', readable: '02:00 and 16:00 on the 1, 8, 15 and 22nd of every month and every Mon and Tue', sixth: false },
// 			{ cron: '15 3,8,10,12,14,16,18 16 * *', readable: 'Every 15th minute past the 3, 8, 10, 12, 14, 16 and 18th hour on the 16th of every month', sixth: false },
// 			{ cron: '2 8,10,12,14,16,18 * 8 0,3', readable: 'Every 2nd minute past the 8, 10, 12, 14, 16 and 18th hour on Sun and Wed in Aug', sixth: false },
// 			{ cron: '0 0 18 1/1 * ?', readable: '00:00 on the 18th of every month', sixth: false },
// 			{ cron: '30 10 * * 0', readable: '10:30 on Sun', sixth: false },
// 			{ cron: '* * * * *', readable: 'Every minute', sixth: false },
// 			{ cron: '*/2 * * * *', readable: 'Every other minute', sixth: false },

// 			{ cron: '0 0 18 1/1 * ? *', readable: '18:00:00 every day', sixth: true },
// 			{ cron: '* * * * * *', readable: 'Every second', sixth: true },
// 			{ cron: '0/1 0/1 0/1 0/1 0/1 0/1', readable: 'Every second', sixth: true },
// 			{ cron: '*/4 2 4 * * *', readable: 'Every 4 seconds on the 2nd minute past the 4th hour', sixth: true },
// 			{ cron: '30 15 9 * * *', readable: '09:15:30 every day', sixth: true },
// 			{ cron: '*/30 15 9 * * *', readable: '09:15:00 and 09:15:30 every day', sixth: true },
// 			{ cron: '*/2 * * * * *', readable: 'Every other second', sixth: true },
// 			{ cron: '*/3 * * * * *', readable: 'Every 3 seconds', sixth: true },
// 			{ cron: '*/4 * * * * *', readable: 'Every 4 seconds', sixth: true },
// 			{ cron: '*/5 * * * * *', readable: 'Every 5 seconds', sixth: true },
// 			{ cron: '*/6 * * * * *', readable: 'Every 6 seconds', sixth: true },
// 			{ cron: '*/10 * * * * *', readable: 'Every 10 seconds', sixth: true },
// 			{ cron: '*/12 * * * * *', readable: 'Every 12 seconds', sixth: true },
// 			{ cron: '*/15 * * * * *', readable: 'Every 15 seconds', sixth: true },
// 			{ cron: '*/20 * * * * *', readable: 'Every 20 seconds', sixth: true },
// 			{ cron: '*/30 * * * * *', readable: 'Every minute starting on the first and 30th second', sixth: true },
// 			{ cron: '5 * * * * *', readable: 'Every minute starting on the 5th second', sixth: true },
// 			{ cron: '5 */2 * * * *', readable: 'Every other minute starting on the 5th second', sixth: true },
// 			{ cron: '30 * * * * *', readable: 'Every minute starting on the 30th second', sixth: true },
// 			{ cron: '0,2,4,20 * * * * *', readable: 'Every minute starting on the 0, 2, 4 and 20th second', sixth: true },
// 			{ cron: '5,10/30 * * * 1,3 8', readable: 'Every minute starting on the 5, 10 and 40th second on Sat in Jan and Mar', sixth: true },
// 			{ cron: '15-17 * * * * *', readable: 'Every minute starting on the 15, 16 and 17th second', sixth: true },
// 		];

// 		for (const t of testCases) {
// 			const input = t.cron;
// 			const expected = t.readable;
// 			const actual = prettycron.toString(input, t.sixth);
// 			expect(actual).toBe(expected);
// 		}
// 	});

// });
