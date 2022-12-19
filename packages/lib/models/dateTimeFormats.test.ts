import Setting from '../models/Setting';
import time from '../time';

describe('dateFormats', function() {



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
		// DATE_FORMAT_9 = 'YYYY/MM/DD';

		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_1)).toBe('30/01/2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_2)).toBe('30/01/17');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_3)).toBe('01/30/2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_4)).toBe('01/30/17');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_5)).toBe('2017-01-30');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_6)).toBe('30.01.2017');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_7)).toBe('2017.01.30');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_8)).toBe('170130');
		expect(time.formatMsToLocal(now, Setting.DATE_FORMAT_9)).toBe('2017/01/30');

	}));

	it('should format time according to TIME_FORMAT', (async () => {

		const now = new Date('2017-01-30T20:30:00').getTime();

		// TIME_FORMAT_1 = 'HH:mm';
		// TIME_FORMAT_2 = 'h:mm A';
		// TIME_FORMAT_3 = 'HH.mm';

		expect(time.formatMsToLocal(now, Setting.TIME_FORMAT_1)).toBe('20:30');
		expect(time.formatMsToLocal(now, Setting.TIME_FORMAT_2)).toBe('8:30 PM');
		expect(time.formatMsToLocal(now, Setting.TIME_FORMAT_3)).toBe('20.30');
	}));

});
