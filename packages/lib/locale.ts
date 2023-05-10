const { sprintf } = require('sprintf-js');

interface StringToStringMap {
	[key: string]: string;
}

interface CodeToCountryMap {
	[key: string]: string[];
}

const codeToLanguageE_: StringToStringMap = {};
codeToLanguageE_['aa'] = 'Afar';
codeToLanguageE_['ab'] = 'Abkhazian';
codeToLanguageE_['af'] = 'Afrikaans';
codeToLanguageE_['am'] = 'Amharic';
codeToLanguageE_['an'] = 'Aragonese';
codeToLanguageE_['ar'] = 'Arabic';
codeToLanguageE_['as'] = 'Assamese';
codeToLanguageE_['ay'] = 'Aymara';
codeToLanguageE_['az'] = 'Azerbaijani';
codeToLanguageE_['ba'] = 'Bashkir';
codeToLanguageE_['be'] = 'Byelorussian';
codeToLanguageE_['bg'] = 'Bulgarian';
codeToLanguageE_['bh'] = 'Bihari';
codeToLanguageE_['bi'] = 'Bislama';
codeToLanguageE_['bn'] = 'Bangla';
codeToLanguageE_['bo'] = 'Tibetan';
codeToLanguageE_['br'] = 'Breton';
codeToLanguageE_['bs'] = 'Bosnian';
codeToLanguageE_['ca'] = 'Catalan';
codeToLanguageE_['co'] = 'Corsican';
codeToLanguageE_['cs'] = 'Czech';
codeToLanguageE_['cy'] = 'Welsh';
codeToLanguageE_['da'] = 'Danish';
codeToLanguageE_['de'] = 'German';
codeToLanguageE_['dz'] = 'Bhutani';
codeToLanguageE_['el'] = 'Greek';
codeToLanguageE_['en'] = 'English';
codeToLanguageE_['eo'] = 'Esperanto';
codeToLanguageE_['es'] = 'Spanish';
codeToLanguageE_['et'] = 'Estonian';
codeToLanguageE_['eu'] = 'Basque';
codeToLanguageE_['fa'] = 'Persian';
codeToLanguageE_['fi'] = 'Finnish';
codeToLanguageE_['fj'] = 'Fiji';
codeToLanguageE_['fo'] = 'Faroese';
codeToLanguageE_['fr'] = 'French';
codeToLanguageE_['fy'] = 'Frisian';
codeToLanguageE_['ga'] = 'Irish';
codeToLanguageE_['gd'] = 'Gaelic';
codeToLanguageE_['gl'] = 'Galician';
codeToLanguageE_['gn'] = 'Guarani';
codeToLanguageE_['gu'] = 'Gujarati';
codeToLanguageE_['ha'] = 'Hausa';
codeToLanguageE_['he'] = 'Hebrew';
codeToLanguageE_['hi'] = 'Hindi';
codeToLanguageE_['hr'] = 'Croatian';
codeToLanguageE_['hu'] = 'Hungarian';
codeToLanguageE_['hy'] = 'Armenian';
codeToLanguageE_['ia'] = 'Interlingua';
codeToLanguageE_['id'] = 'Indonesian';
codeToLanguageE_['ie'] = 'Interlingue';
codeToLanguageE_['ik'] = 'Inupiak';
codeToLanguageE_['is'] = 'Icelandic';
codeToLanguageE_['it'] = 'Italian';
codeToLanguageE_['iu'] = 'Inuktitut';
codeToLanguageE_['ja'] = 'Japanese';
codeToLanguageE_['jw'] = 'Javanese';
codeToLanguageE_['ka'] = 'Georgian';
codeToLanguageE_['kk'] = 'Kazakh';
codeToLanguageE_['kl'] = 'Greenlandic';
codeToLanguageE_['km'] = 'Cambodian';
codeToLanguageE_['kn'] = 'Kannada';
codeToLanguageE_['ko'] = 'Korean';
codeToLanguageE_['ks'] = 'Kashmiri';
codeToLanguageE_['ku'] = 'Kurdish';
codeToLanguageE_['ky'] = 'Kirghiz';
codeToLanguageE_['la'] = 'Latin';
codeToLanguageE_['ln'] = 'Lingala';
codeToLanguageE_['lo'] = 'Laothian';
codeToLanguageE_['lt'] = 'Lithuanian';
codeToLanguageE_['lv'] = 'Latvian';
codeToLanguageE_['mg'] = 'Malagasy';
codeToLanguageE_['mi'] = 'Maori';
codeToLanguageE_['mk'] = 'Macedonian';
codeToLanguageE_['ml'] = 'Malayalam';
codeToLanguageE_['mn'] = 'Mongolian';
codeToLanguageE_['mo'] = 'Moldavian';
codeToLanguageE_['mr'] = 'Marathi';
codeToLanguageE_['ms'] = 'Malay';
codeToLanguageE_['mt'] = 'Maltese';
codeToLanguageE_['my'] = 'Burmese';
codeToLanguageE_['na'] = 'Nauru';
codeToLanguageE_['nb'] = 'Norwegian';
codeToLanguageE_['ne'] = 'Nepali';
codeToLanguageE_['nl'] = 'Dutch';
codeToLanguageE_['no'] = 'Norwegian';
codeToLanguageE_['oc'] = 'Occitan';
codeToLanguageE_['om'] = 'Oromo';
codeToLanguageE_['or'] = 'Oriya';
codeToLanguageE_['pa'] = 'Punjabi';
codeToLanguageE_['pl'] = 'Polish';
codeToLanguageE_['ps'] = 'Pushto';
codeToLanguageE_['pt'] = 'Portuguese';
codeToLanguageE_['qu'] = 'Quechua';
codeToLanguageE_['rm'] = 'Rhaeto-Romance';
codeToLanguageE_['rn'] = 'Kirundi';
codeToLanguageE_['ro'] = 'Romanian';
codeToLanguageE_['ru'] = 'Russian';
codeToLanguageE_['rw'] = 'Kinyarwanda';
codeToLanguageE_['sa'] = 'Sanskrit';
codeToLanguageE_['sd'] = 'Sindhi';
codeToLanguageE_['sg'] = 'Sangho';
codeToLanguageE_['sh'] = 'Serbo-Croatian';
codeToLanguageE_['si'] = 'Sinhalese';
codeToLanguageE_['sk'] = 'Slovak';
codeToLanguageE_['sl'] = 'Slovenian';
codeToLanguageE_['sm'] = 'Samoan';
codeToLanguageE_['sn'] = 'Shona';
codeToLanguageE_['so'] = 'Somali';
codeToLanguageE_['sq'] = 'Albanian';
codeToLanguageE_['sr'] = 'Serbian';
codeToLanguageE_['ss'] = 'Siswati';
codeToLanguageE_['st'] = 'Sesotho';
codeToLanguageE_['su'] = 'Sundanese';
codeToLanguageE_['sv'] = 'Swedish';
codeToLanguageE_['sw'] = 'Swahili';
codeToLanguageE_['ta'] = 'Tamil';
codeToLanguageE_['te'] = 'Telugu';
codeToLanguageE_['tg'] = 'Tajik';
codeToLanguageE_['th'] = 'Thai';
codeToLanguageE_['ti'] = 'Tigrinya';
codeToLanguageE_['tk'] = 'Turkmen';
codeToLanguageE_['tl'] = 'Tagalog';
codeToLanguageE_['tn'] = 'Setswana';
codeToLanguageE_['to'] = 'Tonga';
codeToLanguageE_['tr'] = 'Turkish';
codeToLanguageE_['ts'] = 'Tsonga';
codeToLanguageE_['tt'] = 'Tatar';
codeToLanguageE_['tw'] = 'Twi';
codeToLanguageE_['ug'] = 'Uighur';
codeToLanguageE_['uk'] = 'Ukrainian';
codeToLanguageE_['ur'] = 'Urdu';
codeToLanguageE_['uz'] = 'Uzbek';
codeToLanguageE_['vi'] = 'Vietnamese';
codeToLanguageE_['vo'] = 'Volapuk';
codeToLanguageE_['wo'] = 'Wolof';
codeToLanguageE_['xh'] = 'Xhosa';
codeToLanguageE_['yi'] = 'Yiddish';
codeToLanguageE_['yo'] = 'Yoruba';
codeToLanguageE_['za'] = 'Zhuang';
codeToLanguageE_['zh'] = 'Chinese';
codeToLanguageE_['zu'] = 'Zulu';

const codeToLanguage_: StringToStringMap = {};
codeToLanguage_['an'] = 'Aragonés';
codeToLanguage_['da'] = 'Dansk';
codeToLanguage_['de'] = 'Deutsch';
codeToLanguage_['en'] = 'English';
codeToLanguage_['es'] = 'Español';
codeToLanguage_['fr'] = 'Français';
codeToLanguage_['he'] = 'עיברית';
codeToLanguage_['it'] = 'Italiano';
codeToLanguage_['lt'] = 'Lietuvių kalba';
codeToLanguage_['lv'] = 'Latviešu';
codeToLanguage_['nl'] = 'Nederlands';
codeToLanguage_['pl'] = 'Polski';
codeToLanguage_['pt'] = 'Português';
codeToLanguage_['ru'] = 'Русский';
codeToLanguage_['sk'] = 'Slovenčina';
codeToLanguage_['sq'] = 'Shqip';
codeToLanguage_['sr'] = 'српски језик';
codeToLanguage_['tr'] = 'Türkçe';
codeToLanguage_['ja'] = '日本語';
codeToLanguage_['ko'] = '한국어';
codeToLanguage_['sv'] = 'Svenska';
codeToLanguage_['el'] = 'Ελληνικά';
codeToLanguage_['zh'] = '中文';
codeToLanguage_['ro'] = 'Română';
codeToLanguage_['et'] = 'Eesti Keel';
codeToLanguage_['vi'] = 'Tiếng Việt';
codeToLanguage_['hu'] = 'Magyar';

const codeToCountry_: CodeToCountryMap = {
	AD: ['Andorra', 'Andorra'],
	AE: ['United Arab Emirates', 'دولة الإمارات العربيّة المتّحدة'],
	AF: ['Afghanistan', 'د افغانستان اسلامي دولتدولت اسلامی افغانستان, جمهوری اسلامی افغانستان'],
	AG: ['Antigua and Barbuda', 'Antigua and Barbuda'],
	AI: ['Anguilla', 'Anguilla'],
	AL: ['Albania', 'Shqipëria'],
	AM: ['Armenia', 'Հայաստան'],
	AO: ['Angola', 'Angola'],
	AQ: ['Antarctica', 'Antarctica, Antártico, Antarctique, Антарктике'],
	AR: ['Argentina', 'Argentina'],
	AS: ['American Samoa', 'American Samoa'],
	AT: ['Austria', 'Österreich'],
	AU: ['Australia', 'Australia'],
	AW: ['Aruba', 'Aruba'],
	AX: ['Aland Islands', 'Åland'],
	AZ: ['Azerbaijan', 'Azərbaycan'],
	BA: ['Bosnia and Herzegovina', 'Bosna i Hercegovina'],
	BB: ['Barbados', 'Barbados'],
	BD: ['Bangladesh', 'গণপ্রজাতন্ত্রী বাংলাদেশ'],
	BE: ['Belgium', 'België, Belgique, Belgien'],
	BF: ['Burkina Faso', 'Burkina Faso'],
	BG: ['Bulgaria', 'България'],
	BH: ['Bahrain', 'البحرين'],
	BI: ['Burundi', 'Burundi'],
	BJ: ['Benin', 'Bénin'],
	BL: ['Saint-Barthélemy', 'Saint-Barthélemy'],
	BM: ['Bermuda', 'Bermuda'],
	BN: ['Brunei Darussalam', 'Brunei Darussalam'],
	BO: ['Bolivia', 'Bolivia, Bulibiya, Volívia, Wuliwya'],
	BQ: ['Caribbean Netherlands', 'Caribisch Nederland'],
	BR: ['Brazil', 'Brasil'],
	BS: ['Bahamas', 'Bahamas'],
	BT: ['Bhutan', 'འབྲུག་ཡུལ'],
	BV: ['Bouvet Island', 'Bouvetøya'],
	BW: ['Botswana', 'Botswana'],
	BY: ['Belarus', 'Беларусь'],
	BZ: ['Belize', 'Belize'],
	CA: ['Canada', 'Canada'],
	CC: ['Cocos (Keeling) Islands', 'Cocos (Keeling) Islands'],
	CD: ['Democratic Republic of the Congo (Congo-Kinshasa, former Zaire)', 'République Démocratique du Congo'],
	CF: ['Centrafrican Republic', 'République centrafricaine, Ködörösêse tî Bêafrîka'],
	CG: ['Republic of the Congo (Congo-Brazzaville)', 'République du Congo'],
	CH: ['Switzerland', 'Schweiz, Suisse, Svizzera, Svizra'],
	CI: ['Côte d\'Ivoire', 'Côte d\'Ivoire'],
	CK: ['Cook Islands', 'Cook Islands, Kūki ʻĀirani'],
	CL: ['Chile', 'Chile'],
	CM: ['Cameroon', 'Cameroun, Cameroon'],
	CN: ['China', '中国'],
	CO: ['Colombia', 'Colombia'],
	CR: ['Costa Rica', 'Costa Rica'],
	CU: ['Cuba', 'Cuba'],
	CV: ['Cabo Verde', 'Cabo Verde'],
	CW: ['Curaçao', 'Curaçao'],
	CX: ['Christmas Island', 'Christmas Island'],
	CY: ['Cyprus', 'Κύπρος, Kibris'],
	CZ: ['Czech Republic', 'Česká republika'],
	DE: ['Germany', 'Deutschland'],
	DJ: ['Djibouti', 'Djibouti, جيبوتي, Jabuuti, Gabuutih'],
	DK: ['Denmark', 'Danmark'],
	DM: ['Dominica', 'Dominica'],
	DO: ['Dominican Republic', 'República Dominicana'],
	DZ: ['Algeria', 'الجزائر'],
	EC: ['Ecuador', 'Ecuador'],
	EE: ['Estonia', 'Eesti'],
	EG: ['Egypt', 'مصر'],
	EH: ['Western Sahara', 'Sahara Occidental'],
	ER: ['Eritrea', 'ኤርትራ, إرتريا, Eritrea'],
	ES: ['Spain', 'España'],
	ET: ['Ethiopia', 'ኢትዮጵያ, Itoophiyaa'],
	FI: ['Finland', 'Suomi'],
	FJ: ['Fiji', 'Fiji'],
	FK: ['Falkland Islands', 'Falkland Islands'],
	FM: ['Micronesia (Federated States of)', 'Micronesia'],
	FO: ['Faroe Islands', 'Føroyar, Færøerne'],
	FR: ['France', 'France'],
	GA: ['Gabon', 'Gabon'],
	GB: ['United Kingdom', 'United Kingdom'],
	GD: ['Grenada', 'Grenada'],
	GE: ['Georgia', 'საქართველო'],
	GF: ['French Guiana', 'Guyane française'],
	GG: ['Guernsey', 'Guernsey'],
	GH: ['Ghana', 'Ghana'],
	GI: ['Gibraltar', 'Gibraltar'],
	GL: ['Greenland', 'Kalaallit Nunaat, Grønland'],
	GM: ['The Gambia', 'The Gambia'],
	GN: ['Guinea', 'Guinée'],
	GP: ['Guadeloupe', 'Guadeloupe'],
	GQ: ['Equatorial Guinea', 'Guiena ecuatorial, Guinée équatoriale, Guiné Equatorial'],
	GR: ['Greece', 'Ελλάδα'],
	GS: ['South Georgia and the South Sandwich Islands', 'South Georgia and the South Sandwich Islands'],
	GT: ['Guatemala', 'Guatemala'],
	GU: ['Guam', 'Guam, Guåhån'],
	GW: ['Guinea Bissau', 'Guiné-Bissau'],
	GY: ['Guyana', 'Guyana'],
	HK: ['Hong Kong (SAR of China)', '香港, Hong Kong'],
	HM: ['Heard Island and McDonald Islands', 'Heard Island and McDonald Islands'],
	HN: ['Honduras', 'Honduras'],
	HR: ['Croatia', 'Hrvatska'],
	HT: ['Haiti', 'Haïti, Ayiti'],
	HU: ['Hungary', 'Magyarország'],
	ID: ['Indonesia', 'Indonesia'],
	IE: ['Ireland', 'Ireland, Éire'],
	IL: ['Israel', 'ישראל'],
	IM: ['Isle of Man', 'Isle of Man'],
	IN: ['India', 'भारत, India'],
	IO: ['British Indian Ocean Territory', 'British Indian Ocean Territory'],
	IQ: ['Iraq', 'العراق, Iraq'],
	IR: ['Iran', 'ایران'],
	IS: ['Iceland', 'Ísland'],
	IT: ['Italy', 'Italia'],
	JE: ['Jersey', 'Jersey'],
	JM: ['Jamaica', 'Jamaica'],
	JO: ['Jordan', 'الأُرْدُن'],
	JP: ['Japan', '日本'],
	KE: ['Kenya', 'Kenya'],
	KG: ['Kyrgyzstan', 'Кыргызстан, Киргизия'],
	KH: ['Cambodia', 'កម្ពុជា'],
	KI: ['Kiribati', 'Kiribati'],
	KM: ['Comores', 'ﺍﻟﻘﻤﺮي, Comores, Komori'],
	KN: ['Saint Kitts and Nevis', 'Saint Kitts and Nevis'],
	KP: ['North Korea', '북조선'],
	KR: ['South Korea', '대한민국'],
	KW: ['Kuwait', 'الكويت'],
	KY: ['Cayman Islands', 'Cayman Islands'],
	KZ: ['Kazakhstan', 'Қазақстан, Казахстан'],
	LA: ['Laos', 'ປະຊາຊົນລາວ'],
	LB: ['Lebanon', 'لبنان, Liban'],
	LC: ['Saint Lucia', 'Saint Lucia'],
	LI: ['Liechtenstein', 'Liechtenstein'],
	LK: ['Sri Lanka', 'ශ්‍රී ලංකා, இலங்கை'],
	LR: ['Liberia', 'Liberia'],
	LS: ['Lesotho', 'Lesotho'],
	LT: ['Lithuania', 'Lietuva'],
	LU: ['Luxembourg', 'Lëtzebuerg, Luxembourg, Luxemburg'],
	LV: ['Latvia', 'Latvija'],
	LY: ['Libya', 'ليبيا'],
	MA: ['Morocco', 'Maroc, ⵍⵎⵖⵔⵉⴱ, المغرب'],
	MC: ['Monaco', 'Monaco'],
	MD: ['Moldova', 'Moldova, Молдавия'],
	ME: ['Montenegro', 'Crna Gora, Црна Гора'],
	MF: ['Saint Martin (French part)', 'Saint-Martin'],
	MG: ['Madagascar', 'Madagasikara, Madagascar'],
	MH: ['Marshall Islands', 'Marshall Islands'],
	MK: ['North Macedonia', 'Северна Македонија'],
	ML: ['Mali', 'Mali'],
	MM: ['Myanmar', 'မြန်မာ'],
	MN: ['Mongolia', 'Монгол Улс'],
	MO: ['Macao (SAR of China)', '澳門, Macau'],
	MP: ['Northern Mariana Islands', 'Northern Mariana Islands'],
	MQ: ['Martinique', 'Martinique'],
	MR: ['Mauritania', 'موريتانيا, Mauritanie'],
	MS: ['Montserrat', 'Montserrat'],
	MT: ['Malta', 'Malta'],
	MU: ['Mauritius', 'Maurice, Mauritius'],
	MV: ['Maldives', ''],
	MW: ['Malawi', 'Malawi'],
	MX: ['Mexico', 'México'],
	MY: ['Malaysia', ''],
	MZ: ['Mozambique', 'Mozambique'],
	NA: ['Namibia', 'Namibia'],
	NC: ['New Caledonia', 'Nouvelle-Calédonie'],
	NE: ['Niger', 'Niger'],
	NF: ['Norfolk Island', 'Norfolk Island'],
	NG: ['Nigeria', 'Nigeria'],
	NI: ['Nicaragua', 'Nicaragua'],
	NL: ['The Netherlands', 'Nederland'],
	NO: ['Norway', 'Norge, Noreg'],
	NP: ['Nepal', ''],
	NR: ['Nauru', 'Nauru'],
	NU: ['Niue', 'Niue'],
	NZ: ['New Zealand', 'New Zealand'],
	OM: ['Oman', 'سلطنة عُمان'],
	PA: ['Panama', 'Panama'],
	PE: ['Peru', 'Perú'],
	PF: ['French Polynesia', 'Polynésie française'],
	PG: ['Papua New Guinea', 'Papua New Guinea'],
	PH: ['Philippines', 'Philippines'],
	PK: ['Pakistan', 'پاکستان'],
	PL: ['Poland', 'Polska'],
	PM: ['Saint Pierre and Miquelon', 'Saint-Pierre-et-Miquelon'],
	PN: ['Pitcairn', 'Pitcairn'],
	PR: ['Puerto Rico', 'Puerto Rico'],
	PS: ['Palestinian Territory', 'Palestinian Territory'],
	PT: ['Portugal', 'Portugal'],
	PW: ['Palau', 'Palau'],
	PY: ['Paraguay', 'Paraguay'],
	QA: ['Qatar', 'قطر'],
	RE: ['Reunion', 'La Réunion'],
	RO: ['Romania', 'România'],
	RS: ['Serbia', 'Србија'],
	RU: ['Russia', 'Россия'],
	RW: ['Rwanda', 'Rwanda'],
	SA: ['Saudi Arabia', 'السعودية'],
	SB: ['Solomon Islands', 'Solomon Islands'],
	SC: ['Seychelles', 'Seychelles'],
	SD: ['Sudan', 'السودان'],
	SE: ['Sweden', 'Sverige'],
	SG: ['Singapore', 'Singapore'],
	SH: ['Saint Helena', 'Saint Helena'],
	SI: ['Slovenia', 'Slovenija'],
	SJ: ['Svalbard and Jan Mayen', 'Svalbard and Jan Mayen'],
	SK: ['Slovakia', 'Slovensko'],
	SL: ['Sierra Leone', 'Sierra Leone'],
	SM: ['San Marino', 'San Marino'],
	SN: ['Sénégal', 'Sénégal'],
	SO: ['Somalia', 'Somalia, الصومال'],
	SR: ['Suriname', 'Suriname'],
	ST: ['São Tomé and Príncipe', 'São Tomé e Príncipe'],
	SS: ['South Sudan', 'South Sudan'],
	SV: ['El Salvador', 'El Salvador'],
	SX: ['Saint Martin (Dutch part)', 'Sint Maarten'],
	SY: ['Syria', 'سوريا, Sūriyya'],
	SZ: ['eSwatini', 'eSwatini'],
	TC: ['Turks and Caicos Islands', 'Turks and Caicos Islands'],
	TD: ['Chad', 'Tchad, تشاد'],
	TF: ['French Southern and Antarctic Lands', 'Terres australes et antarctiques françaises'],
	TG: ['Togo', 'Togo'],
	TH: ['Thailand', 'ประเทศไทย'],
	TJ: ['Tajikistan', ','],
	TK: ['Tokelau', 'Tokelau'],
	TL: ['Timor-Leste', 'Timor-Leste'],
	TM: ['Turkmenistan', 'Türkmenistan'],
	TN: ['Tunisia', 'تونس, Tunisie'],
	TO: ['Tonga', 'Tonga'],
	TR: ['Turkey', 'Türkiye'],
	TT: ['Trinidad and Tobago', 'Trinidad and Tobago'],
	TV: ['Tuvalu', 'Tuvalu'],
	TW: ['Taiwan', 'Taiwan'],
	TZ: ['Tanzania', 'Tanzania'],
	UA: ['Ukraine', 'Україна'],
	UG: ['Uganda', 'Uganda'],
	UM: ['United States Minor Outlying Islands', 'United States Minor Outlying Islands'],
	US: ['United States of America', 'United States of America'],
	UY: ['Uruguay', 'Uruguay'],
	UZ: ['Uzbekistan', ''],
	VA: ['City of the Vatican', 'Città del Vaticano'],
	VC: ['Saint Vincent and the Grenadines', 'Saint Vincent and the Grenadines'],
	VE: ['Venezuela', 'Venezuela'],
	VG: ['British Virgin Islands', 'British Virgin Islands'],
	VI: ['United States Virgin Islands', 'United States Virgin Islands'],
	VN: ['Vietnam', 'Việt Nam'],
	VU: ['Vanuatu', 'Vanuatu'],
	WF: ['Wallis and Futuna', 'Wallis-et-Futuna'],
	WS: ['Samoa', 'Samoa'],
	YE: ['Yemen', 'اليَمَن'],
	YT: ['Mayotte', 'Mayotte'],
	ZA: ['South Africa', 'South Africa'],
	ZM: ['Zambia', 'Zambia'],
	ZW: ['Zimbabwe', 'Zimbabwe'],
};

let supportedLocales_: any = null;
let localeStats_: any = null;

const loadedLocales_: any = {};

const defaultLocale_ = 'en_GB';

let currentLocale_ = defaultLocale_;

function defaultLocale() {
	return defaultLocale_;
}

function localeStats() {
	if (!localeStats_) localeStats_ = require('./locales/index.js').stats;
	return localeStats_;
}

function supportedLocales(): string[] {
	if (!supportedLocales_) supportedLocales_ = require('./locales/index.js').locales;

	const output = [];
	for (const n in supportedLocales_) {
		if (!supportedLocales_.hasOwnProperty(n)) continue;
		output.push(n);
	}
	return output;
}

interface SupportedLocalesToLanguagesOptions {
	includeStats?: boolean;
}

function supportedLocalesToLanguages(options: SupportedLocalesToLanguagesOptions = null) {
	if (!options) options = {};
	const stats = localeStats();
	const locales = supportedLocales();
	const output: StringToStringMap = {};
	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		output[locale] = countryDisplayName(locale);

		const stat = stats[locale];
		if (options.includeStats && stat) {
			output[locale] += ` (${stat.percentDone}%)`;
		}
	}
	return output;
}

function closestSupportedLocale(canonicalName: string, defaultToEnglish: boolean = true, locales: string[] = null) {
	locales = locales === null ? supportedLocales() : locales;
	if (locales.indexOf(canonicalName) >= 0) return canonicalName;

	const requiredLanguage = languageCodeOnly(canonicalName).toLowerCase();

	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		const language = locale.split('_')[0];
		if (requiredLanguage === language) return locale;
	}

	return defaultToEnglish ? 'en_GB' : null;
}

function countryName(countryCode: string) {
	const r = codeToCountry_[countryCode] ? codeToCountry_[countryCode] : null;
	if (!r) return '';
	return r.length > 1 && !!r[1] ? r[1] : r[0];
}

function languageNameInEnglish(languageCode: string) {
	return codeToLanguageE_[languageCode] ? codeToLanguageE_[languageCode] : '';
}

function languageName(languageCode: string, defaultToEnglish: boolean = true) {
	if (codeToLanguage_[languageCode]) return codeToLanguage_[languageCode];
	if (defaultToEnglish) return languageNameInEnglish(languageCode);
	return '';
}

function languageCodeOnly(canonicalName: string) {
	if (canonicalName.length < 2) return canonicalName;
	return canonicalName.substr(0, 2);
}

function countryCodeOnly(canonicalName: string) {
	if (canonicalName.length <= 2) return '';
	return canonicalName.substr(3);
}

function countryDisplayName(canonicalName: string) {
	const languageCode = languageCodeOnly(canonicalName);
	const countryCode = countryCodeOnly(canonicalName);

	let output = languageName(languageCode);

	let extraString;

	if (countryCode) {
		if (languageCode === 'zh' && countryCode === 'CN') {
			extraString = '简体'; // "Simplified" in "Simplified Chinese"
		} else {
			extraString = countryName(countryCode);
		}
	}

	if (languageCode === 'zh' && (countryCode === '' || countryCode === 'TW')) extraString = '繁體'; // "Traditional" in "Traditional Chinese"

	if (extraString) {
		output += ` (${extraString})`;
	} else if (countryCode) {
		// If we have a country code but couldn't match it to a country name,
		// just display the full canonical name (applies for example to es-419
		// for Latin American Spanish).
		output += ` (${canonicalName})`;
	}

	return output;
}

function localeStrings(canonicalName: string) {
	const locale = closestSupportedLocale(canonicalName);

	if (loadedLocales_[locale]) return loadedLocales_[locale];

	loadedLocales_[locale] = Object.assign({}, supportedLocales_[locale]);

	return loadedLocales_[locale];
}

const currentLocale = () => {
	return currentLocale_;
};

function setLocale(canonicalName: string) {
	if (currentLocale_ === canonicalName) return;
	currentLocale_ = closestSupportedLocale(canonicalName);
}

function languageCode() {
	return languageCodeOnly(currentLocale_);
}

function localesFromLanguageCode(languageCode: string, locales: string[]): string[] {
	return locales.filter((l: string) => {
		return languageCodeOnly(l) === languageCode;
	});
}

function _(s: string, ...args: any[]): string {
	return stringByLocale(currentLocale_, s, ...args);
}

function _n(singular: string, plural: string, n: number, ...args: any[]) {
	if (n > 1) return _(plural, ...args);
	return _(singular, ...args);
}

const stringByLocale = (locale: string, s: string, ...args: any[]): string => {
	const strings = localeStrings(locale);
	let result = strings[s];
	if (result === '' || result === undefined) result = s;
	try {
		return sprintf(result, ...args);
	} catch (error) {
		return `${result} ${args.join(', ')} (Translation error: ${error.message})`;
	}
};

export { _, _n, supportedLocales, currentLocale, localesFromLanguageCode, languageCodeOnly, countryDisplayName, localeStrings, setLocale, supportedLocalesToLanguages, defaultLocale, closestSupportedLocale, languageCode, countryCodeOnly };
