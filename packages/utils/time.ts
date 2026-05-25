// -----------------------------------------------------------------------------------------------
// NOTE: Some of the code in here is copied from @joplin/lib/time. New time-related code should be
// added here, and should be based on dayjs (not moment)
// -----------------------------------------------------------------------------------------------

// A require() is needed here for this to work in React Native.

// Separating this into a type import and a require seems to be necessary to support mobile:
// - import = require syntax doesn't work when bundling
// - import * as dayJsRelativeTimeType causes a runtime error.

import ar_564 from 'dayjs/locale/ar';
import bg_565 from 'dayjs/locale/bg';
import bs_566 from 'dayjs/locale/bs';
import ca_567 from 'dayjs/locale/ca';
import cs_568 from 'dayjs/locale/cs';
import da_569 from 'dayjs/locale/da';
import de_570 from 'dayjs/locale/de';
import el_571 from 'dayjs/locale/el';
import en_gb_572 from 'dayjs/locale/en-gb';
import en_573 from 'dayjs/locale/en';
import eo_574 from 'dayjs/locale/eo';
import es_575 from 'dayjs/locale/es';
import et_576 from 'dayjs/locale/et';
import eu_577 from 'dayjs/locale/eu';
import fa_578 from 'dayjs/locale/fa';
import fi_579 from 'dayjs/locale/fi';
import fr_580 from 'dayjs/locale/fr';
import gl_581 from 'dayjs/locale/gl';
import hr_582 from 'dayjs/locale/hr';
import hu_583 from 'dayjs/locale/hu';
import id_584 from 'dayjs/locale/id';
import it_585 from 'dayjs/locale/it';
import ja_586 from 'dayjs/locale/ja';
import ko_587 from 'dayjs/locale/ko';
import nb_588 from 'dayjs/locale/nb';
import nl_be_589 from 'dayjs/locale/nl-be';
import nl_590 from 'dayjs/locale/nl';
import pl_591 from 'dayjs/locale/pl';
import pt_br_592 from 'dayjs/locale/pt-br';
import pt_593 from 'dayjs/locale/pt';
import ro_594 from 'dayjs/locale/ro';
import ru_595 from 'dayjs/locale/ru';
import sl_596 from 'dayjs/locale/sl';
import sr_597 from 'dayjs/locale/sr';
import sv_598 from 'dayjs/locale/sv';
import th_599 from 'dayjs/locale/th';
import tr_600 from 'dayjs/locale/tr';
import uk_601 from 'dayjs/locale/uk';
import vi_602 from 'dayjs/locale/vi';
import zh_cn_603 from 'dayjs/locale/zh-cn';
import zh_tw_604 from 'dayjs/locale/zh-tw';
import dayjs from 'dayjs';
import dayJsRelativeTime from 'dayjs/plugin/relativeTime';
import type * as dayjsImport from 'dayjs';
import * as dayJsUtc from 'dayjs/plugin/utc';
import type * as dayJsRelativeTimeType from 'dayjs/plugin/relativeTime';
const supportedLocales: Record<string, unknown> = {
	'ar': ar_564,
	'bg': bg_565,
	'bs': bs_566,
	'ca': ca_567,
	'cs': cs_568,
	'da': da_569,
	'de': de_570,
	'el': el_571,
	'en-gb': en_gb_572,
	'en': en_573,
	'eo': eo_574,
	'es': es_575,
	'et': et_576,
	'eu': eu_577,
	'fa': fa_578,
	'fi': fi_579,
	'fr': fr_580,
	'gl': gl_581,
	'hr': hr_582,
	'hu': hu_583,
	'id': id_584,
	'it': it_585,
	'ja': ja_586,
	'ko': ko_587,
	'nb': nb_588,
	'nl-be': nl_be_589,
	'nl': nl_590,
	'pl': pl_591,
	'pt-br': pt_br_592,
	'pt': pt_593,
	'ro': ro_594,
	'ru': ru_595,
	'sl': sl_596,
	'sr': sr_597,
	'sv': sv_598,
	'th': th_599,
	'tr': tr_600,
	'uk': uk_601,
	'vi': vi_602,
	'zh-cn': zh_cn_603,
	'zh-tw': zh_tw_604,
};

export const Second = 1000;
export const Minute = 60 * Second;
export const Hour = 60 * Minute;
export const Day = 24 * Hour;
export const Week = 7 * Day;
export const Month = 30 * Day;

function initDayJs() {
	dayjs.extend(dayJsRelativeTime);
	dayjs.extend(dayJsUtc);
}

initDayJs();

let dateFormat_ = 'DD/MM/YYYY';
let timeFormat_ = 'HH:mm';

export const msleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

// Use the utility functions below to easily measure performance of a block or
// line of code.
interface PerfTimer {
	name: string;
	startTime: number;
}

const perfTimers_: PerfTimer[] = [];

export function timerPush(name: string) {
	perfTimers_.push({ name, startTime: Date.now() });
}

export function timerPop() {
	const t = perfTimers_.pop() as PerfTimer;
	// eslint-disable-next-line no-console
	console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}

export const formatMsToRelative = (ms: number) => {
	if (Date.now() - ms > 2 * Day) return formatMsToLocal(ms);
	const d = dayjs(ms);

	// The expected pattern for invalid date formatting in JS is to return the string "Invalid
	// Date", so we do that here. If we don't, dayjs will process the invalid date and return "a
	// month ago", somehow...
	if (!d.isValid()) return 'Invalid date';

	return d.fromNow(false);
};

const joplinLocaleToDayJsLocale = (locale: string) => {
	locale = locale.toLowerCase().replace(/_/, '-');
	if (supportedLocales[locale]) return locale;

	const lang = locale.split('-')[0];
	if (supportedLocales[lang]) return lang;

	return 'en-gb';
};

export const setTimeLocale = (locale: string) => {
	const dayJsLocale = joplinLocaleToDayJsLocale(locale);
	dayjs.locale(dayJsLocale);
};

export const setDateFormat = (format: string) => {
	dateFormat_ = format;
};

export const setTimeFormat = (format: string) => {
	timeFormat_ = format;
};

const dateFormat = () => {
	return dateFormat_;
};

const timeFormat = () => {
	return timeFormat_;
};

const dateTimeFormat = () => {
	return `${dateFormat()} ${timeFormat()}`;
};

export const formatMsToLocal = (ms: number, format: string|null = null) => {
	if (format === null) format = dateTimeFormat();
	return dayjs(ms).format(format);
};

export const formatMsToDateTimeLocal = (ms: number) => {
	return formatMsToLocal(ms, 'YYYY-MM-DDTHH:mm');
};

export const isValidDate = (anything: string) => {
	return dayjs(anything).isValid();
};

export const formatDateTimeLocalToMs = (anything: string) => {
	return dayjs(anything).unix() * 1000;
};

export const formatMsToDurationCompat = (ms: number) => {
	// Avoid using dayjs (and @joplin/utils/time) for formatting here.
	// See https://github.com/laurent22/joplin/issues/11864
	const seconds = Math.floor(ms / Second) % 60;
	const minutes = Math.floor(ms / Minute);
	const paddedSeconds = `${seconds}`.padStart(2, '0');
	return `${minutes}:${paddedSeconds}`;
};


export const goBackInTime = (startDateMs: number, n: number, period: dayjsImport.ManipulateType) => {
	return dayjs(startDateMs).subtract(n, period);
};

export const formatMsToUTC = (ms: number, format: string|null = null) => {
	if (format === null) format = dateTimeFormat();
	return dayjs(ms).utc().format(format);
};
