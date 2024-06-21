const { sprintf } = require('sprintf-js');

interface StringToStringMap {
	[key: string]: string;
}

interface CodeToCountryMap {
	[key: string]: string[];
}
type ParsePluralFormFunction = (n: number)=> number;

interface Iso639Item {
	alpha3: string;
	alpha2: string;
	nameEnglish: string;
	nameNative: string;
}

type Iso639Line = [string, string, string, string?];

// cSpell:disable

// Source: https://www.loc.gov/standards/iso639-2/php/code_list.php
// ISO 639-2 Code, ISO 639-1 Code, English name of Language
const iso639_: Iso639Line[] = [
	['aar', 'aa', 'Afar'],
	['abk', 'ab', 'Abkhazian'],
	['ave', 'ae', 'Avestan'],
	['afr', 'af', 'Afrikaans'],
	['aka', 'ak', 'Akan'],
	['amh', 'am', 'Amharic'],
	['arg', 'an', 'Aragonese', 'Aragonés'],
	['ara', 'ar', 'Arabic'],
	['asm', 'as', 'Assamese'],
	['ava', 'av', 'Avaric'],
	['aym', 'ay', 'Aymara'],
	['aze', 'az', 'Azerbaijani'],
	['bak', 'ba', 'Bashkir'],
	['bel', 'be', 'Belarusian'],
	['bul', 'bg', 'Bulgarian'],
	['bih', 'bh', 'Bihari languages'],
	['bis', 'bi', 'Bislama'],
	['bam', 'bm', 'Bambara'],
	['ben', 'bn', 'Bengali'],
	['bod', 'bo', 'Tibetan'],
	['bre', 'br', 'Breton'],
	['bos', 'bs', 'Bosnian'],
	['cat', 'ca', 'Catalan; Valencian'],
	['che', 'ce', 'Chechen'],
	['cha', 'ch', 'Chamorro'],
	['cos', 'co', 'Corsican'],
	['cre', 'cr', 'Cree'],
	['ces', 'cs', 'Czech'],
	['chu', 'cu', 'Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic'],
	['chv', 'cv', 'Chuvash'],
	['cym', 'cy', 'Welsh'],
	['dan', 'da', 'Danish', 'Dansk'],
	['deu', 'de', 'German', 'Deutsch'],
	['div', 'dv', 'Divehi; Dhivehi; Maldivian'],
	['dzo', 'dz', 'Dzongkha'],
	['ewe', 'ee', 'Ewe'],
	['ell', 'el', 'Greek, Modern (1453-)', 'Ελληνικά'],
	['eng', 'en', 'English', 'English'],
	['epo', 'eo', 'Esperanto'],
	['spa', 'es', 'Spanish; Castilian', 'Español'],
	['est', 'et', 'Estonian', 'Eesti Keel'],
	['eus', 'eu', 'Basque'],
	['fas', 'fa', 'Persian'],
	['ful', 'ff', 'Fulah'],
	['fin', 'fi', 'Finnish'],
	['fij', 'fj', 'Fijian'],
	['fao', 'fo', 'Faroese'],
	['fra', 'fr', 'French', 'Français'],
	['fry', 'fy', 'Western Frisian'],
	['gle', 'ga', 'Irish'],
	['gla', 'gd', 'Gaelic; Scottish Gaelic'],
	['glg', 'gl', 'Galician'],
	['grn', 'gn', 'Guarani'],
	['guj', 'gu', 'Gujarati'],
	['glv', 'gv', 'Manx'],
	['hau', 'ha', 'Hausa'],
	['heb', 'he', 'Hebrew', 'עיברית'],
	['hin', 'hi', 'Hindi'],
	['hmo', 'ho', 'Hiri Motu'],
	['hrv', 'hr', 'Croatian'],
	['hat', 'ht', 'Haitian; Haitian Creole'],
	['hun', 'hu', 'Hungarian', 'Magyar'],
	['hye', 'hy', 'Armenian'],
	['her', 'hz', 'Herero'],
	['ina', 'ia', 'Interlingua (International Auxiliary Language Association)'],
	['ind', 'id', 'Indonesian'],
	['ile', 'ie', 'Interlingue; Occidental'],
	['ibo', 'ig', 'Igbo'],
	['iii', 'ii', 'Sichuan Yi; Nuosu'],
	['ipk', 'ik', 'Inupiaq'],
	['ido', 'io', 'Ido'],
	['isl', 'is', 'Icelandic'],
	['ita', 'it', 'Italian', 'Italiano'],
	['iku', 'iu', 'Inuktitut'],
	['jpn', 'ja', 'Japanese', '日本語'],
	['jav', 'jv', 'Javanese'],
	['kat', 'ka', 'Georgian'],
	['kon', 'kg', 'Kongo'],
	['kik', 'ki', 'Kikuyu; Gikuyu'],
	['kua', 'kj', 'Kuanyama; Kwanyama'],
	['kaz', 'kk', 'Kazakh'],
	['kal', 'kl', 'Kalaallisut; Greenlandic'],
	['khm', 'km', 'Central Khmer'],
	['kan', 'kn', 'Kannada'],
	['kor', 'ko', 'Korean', '한국어'],
	['kau', 'kr', 'Kanuri'],
	['kas', 'ks', 'Kashmiri'],
	['kur', 'ku', 'Kurdish'],
	['kom', 'kv', 'Komi'],
	['cor', 'kw', 'Cornish'],
	['kir', 'ky', 'Kirghiz; Kyrgyz'],
	['lat', 'la', 'Latin'],
	['ltz', 'lb', 'Luxembourgish; Letzeburgesch'],
	['lug', 'lg', 'Ganda'],
	['lim', 'li', 'Limburgan; Limburger; Limburgish'],
	['lin', 'ln', 'Lingala'],
	['lao', 'lo', 'Lao'],
	['lit', 'lt', 'Lithuanian', 'Lietuvių kalba'],
	['lub', 'lu', 'Luba-Katanga'],
	['lav', 'lv', 'Latvian', 'Latviešu'],
	['mlg', 'mg', 'Malagasy'],
	['mah', 'mh', 'Marshallese'],
	['mri', 'mi', 'Maori'],
	['mkd', 'mk', 'Macedonian'],
	['mal', 'ml', 'Malayalam'],
	['mon', 'mn', 'Mongolian'],
	['mar', 'mr', 'Marathi'],
	['msa', 'ms', 'Malay'],
	['mlt', 'mt', 'Maltese'],
	['mya', 'my', 'Burmese'],
	['nau', 'na', 'Nauru'],
	['nob', 'nb', 'Bokmål, Norwegian; Norwegian Bokmål'],
	['nde', 'nd', 'Ndebele, North; North Ndebele'],
	['nep', 'ne', 'Nepali'],
	['ndo', 'ng', 'Ndonga'],
	['nld', 'nl', 'Dutch; Flemish', 'Nederlands'],
	['nno', 'nn', 'Norwegian Nynorsk; Nynorsk, Norwegian'],
	['nor', 'no', 'Norwegian'],
	['nbl', 'nr', 'Ndebele, South; South Ndebele'],
	['nav', 'nv', 'Navajo; Navaho'],
	['nya', 'ny', 'Chichewa; Chewa; Nyanja'],
	['oci', 'oc', 'Occitan (post 1500)'],
	['oji', 'oj', 'Ojibwa'],
	['orm', 'om', 'Oromo'],
	['ori', 'or', 'Oriya'],
	['oss', 'os', 'Ossetian; Ossetic'],
	['pan', 'pa', 'Panjabi; Punjabi'],
	['pli', 'pi', 'Pali'],
	['pol', 'pl', 'Polish', 'Polski'],
	['pus', 'ps', 'Pushto; Pashto'],
	['por', 'pt', 'Portuguese', 'Português'],
	['que', 'qu', 'Quechua'],
	['roh', 'rm', 'Romansh'],
	['run', 'rn', 'Rundi'],
	['ron', 'ro', 'Romanian; Moldavian; Moldovan', 'Română'],
	['rus', 'ru', 'Russian', 'Русский'],
	['kin', 'rw', 'Kinyarwanda'],
	['san', 'sa', 'Sanskrit'],
	['srd', 'sc', 'Sardinian'],
	['snd', 'sd', 'Sindhi'],
	['sme', 'se', 'Northern Sami'],
	['sag', 'sg', 'Sango'],
	['sin', 'si', 'Sinhala; Sinhalese'],
	['slk', 'sk', 'Slovak', 'Slovenčina'],
	['slv', 'sl', 'Slovenian'],
	['smo', 'sm', 'Samoan'],
	['sna', 'sn', 'Shona'],
	['som', 'so', 'Somali'],
	['sqi', 'sq', 'Albanian', 'Shqip'],
	['srp', 'sr', 'Serbian', 'српски језик'],
	['ssw', 'ss', 'Swati'],
	['sot', 'st', 'Sotho, Southern'],
	['sun', 'su', 'Sundanese'],
	['swe', 'sv', 'Swedish', 'Svenska'],
	['swa', 'sw', 'Swahili'],
	['tam', 'ta', 'Tamil'],
	['tel', 'te', 'Telugu'],
	['tgk', 'tg', 'Tajik'],
	['tha', 'th', 'Thai'],
	['tir', 'ti', 'Tigrinya'],
	['tuk', 'tk', 'Turkmen'],
	['tgl', 'tl', 'Tagalog'],
	['tsn', 'tn', 'Tswana'],
	['ton', 'to', 'Tonga (Tonga Islands)'],
	['tur', 'tr', 'Turkish', 'Türkçe'],
	['tso', 'ts', 'Tsonga'],
	['tat', 'tt', 'Tatar'],
	['twi', 'tw', 'Twi'],
	['tah', 'ty', 'Tahitian'],
	['uig', 'ug', 'Uighur; Uyghur'],
	['ukr', 'uk', 'Ukrainian'],
	['urd', 'ur', 'Urdu'],
	['uzb', 'uz', 'Uzbek'],
	['ven', 've', 'Venda'],
	['vie', 'vi', 'Vietnamese', 'Tiếng Việt'],
	['vol', 'vo', 'Volapük'],
	['wln', 'wa', 'Walloon'],
	['wol', 'wo', 'Wolof'],
	['xho', 'xh', 'Xhosa'],
	['yid', 'yi', 'Yiddish'],
	['yor', 'yo', 'Yoruba'],
	['zha', 'za', 'Zhuang; Chuang'],
	['zho', 'zh', 'Chinese', '中文'],
	['zul', 'zu', 'Zulu'],
];
// cSpell:enable

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let supportedLocales_: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let localeStats_: any = null;

const loadedLocales_: Record<string, Record<string, string[]>> = {};

const pluralFunctions_: Record<string, ParsePluralFormFunction> = {};

const defaultLocale_ = 'en_GB';

let currentLocale_ = defaultLocale_;

// Copied from https://github.com/eugeny-dementev/parse-gettext-plural-form
// along with the tests
export const parsePluralForm = (form: string): ParsePluralFormFunction => {
	const pluralFormRegex = /^(\s*nplurals\s*=\s*[0-9]+\s*;\s*plural\s*=\s*(?:\s|[-?|&=!<>+*/%:;a-zA-Z0-9_()])+)$/m;

	if (!pluralFormRegex.test(form)) throw new Error(`Plural-Forms is invalid: ${form}`);

	if (!/;\s*$/.test(form)) {
		form += ';';
	}

	const code = [
		'var plural;',
		'var nplurals;',
		form,
		'return (plural === true ? 1 : plural ? plural : 0);',
	].join('\n');

	// eslint-disable-next-line no-new-func -- There's a regex to check the form but it's still slightly unsafe, eventually we should automatically generate all the functions in advance in build-translations.ts
	return (new Function('n', code)) as ParsePluralFormFunction;
};

const iso639LineToObject = (line: Iso639Line) => {
	// TODO: filter name in English (remove brackets, commas,)

	const output: Iso639Item = {
		alpha3: line[0],
		alpha2: line[1],
		nameEnglish: line[2],
		nameNative: line[3] ? line[3] : '',
	};

	return output;
};

const iso639InfoFromAlpha2 = (alpha2: string) => {
	alpha2 = alpha2.toLowerCase();
	const line = iso639_.find(e => e[1] === alpha2);
	if (!line) return null;
	return iso639LineToObject(line);
};

const getPluralFunction = (lang: string) => {
	if (!(lang in pluralFunctions_)) {
		const locale = closestSupportedLocale(lang);
		const stats = localeStats()[locale];

		if (!stats.pluralForms) {
			pluralFunctions_[lang] = null;
		} else {
			pluralFunctions_[lang] = parsePluralForm(stats.pluralForms);
		}
	}

	return pluralFunctions_[lang];
};

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

function closestSupportedLocale(canonicalName: string, defaultToEnglish = true, locales: string[] = null) {
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

function languageName(canonicalName: string, defaultToEnglish = true) {
	const languageCode = languageCodeOnly(canonicalName);
	const info = iso639InfoFromAlpha2(languageCode);
	if (!info) return '';
	if (info.nameNative) return info.nameNative;
	if (defaultToEnglish) return info.nameEnglish;
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

	loadedLocales_[locale] = { ...supportedLocales_[locale] };

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

export const toIso639Alpha3 = (code: string) => {
	if (code.includes('_')) {
		const s = code.split('_');
		code = s[0];
	}

	const info = iso639InfoFromAlpha2(code);
	if (!info) throw new Error(`Cannot convert to ISO-639 code: ${code}`);
	return info.alpha3;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function _(s: string, ...args: any[]): string {
	return stringByLocale(currentLocale_, s, ...args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function _n(singular: string, plural: string, n: number, ...args: any[]) {
	if (['en_GB', 'en_US'].includes(currentLocale_)) {
		if (n !== 1) return _(plural, ...args);
		return _(singular, ...args);
	} else {
		const pluralFn = getPluralFunction(currentLocale_);
		const stringIndex = pluralFn ? pluralFn(n) : 0;
		const strings = localeStrings(currentLocale_);
		const result = strings[singular];

		let translatedString = '';
		if (result === undefined || !result.join('')) {
			translatedString = singular;
		} else {
			translatedString = stringIndex < result.length ? result[stringIndex] : result[0];
		}

		try {
			return sprintf(translatedString, ...args);
		} catch (error) {
			return `${translatedString} ${args.join(', ')} (Translation error: ${error.message})`;
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const stringByLocale = (locale: string, s: string, ...args: any[]): string => {
	const strings = localeStrings(locale);
	const result = strings[s];
	let translatedString = '';

	if (result === undefined || !result.join('')) {
		translatedString = s;
	} else {
		translatedString = result[0];
	}

	try {
		return sprintf(translatedString, ...args);
	} catch (error) {
		return `${translatedString} ${args.join(', ')} (Translation error: ${error.message})`;
	}
};

export { _, _n, supportedLocales, languageName, currentLocale, localesFromLanguageCode, languageCodeOnly, countryDisplayName, localeStrings, setLocale, supportedLocalesToLanguages, defaultLocale, closestSupportedLocale, languageCode, countryCodeOnly };
