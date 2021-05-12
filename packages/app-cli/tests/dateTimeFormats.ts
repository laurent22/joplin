import Setting from '@joplin/lib/models/Setting';
import time from '@joplin/lib/time';

describe('dateFormats', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should format date according to DATE_FORMAT', (async () => {

		const now = new Date('2017-01-30T12:00:00').getTime();

		// DATE_FORMAT_1 = 'DD/MM/YYYY';
		// DATE_FORMAT_2 = 'DD/MM/YY';
		// DATE_FORMAT_3 = 'MM/DD/YYYY';
		// DATE_FORMAT_4 = 'MM/DD/YY';
		// DATE_FORMAT_5 = 'YYYY-MM-DD';
		// DATE_FORMAT_6 = 'DD.MM.YYYY';
		// DATE_FORMAT_7 = 'YYYY.MM.DD';
		// DATE_FORMAT_8 = 'YYMMDD';

		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_1)).toBe('30/01/2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_2)).toBe('30/01/17');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_3)).toBe('01/30/2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_4)).toBe('01/30/17');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_5)).toBe('2017-01-30');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_6)).toBe('30.01.2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_7)).toBe('2017.01.30');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_8)).toBe('170130');

	}));

	it('should format time according to TIME_FORMAT', (async () => {

		const now = new Date('2017-01-30T20:30:00').getTime();

		// TIME_FORMAT_1 = 'HH:mm';
		// TIME_FORMAT_2 = 'h:mm A';

		expect(time.formatMsToLocal(now, Setting.TIME_FORMAT_1)).toBe('20:30');
		expect(time.formatMsToLocal(now, Setting.TIME_FORMAT_2)).toBe('8:30 PM');

	}));

});
