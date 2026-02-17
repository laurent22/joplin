export interface SupportedLocale {
	// Locale identifier (e.g., 'en_GB', 'fr_FR')
	id: string;
	// HTML lang attribute (e.g., 'en-gb', 'fr-fr')
	lang: string;
	// URL path prefix (e.g., '', 'fr', 'de', 'cn')
	pathPrefix: string;
	// Short code shown in the language switcher button (e.g., 'EN', 'FR')
	code: string;
	// Full language name in its native form (e.g., 'English', 'Français')
	name: string;
	// hreflang code for SEO (e.g., 'en', 'fr', 'de', 'zh')
	hreflang: string;
}

export const supportedLocales: SupportedLocale[] = [
	{
		id: 'en_GB',
		lang: 'en-gb',
		pathPrefix: '',
		code: 'EN',
		name: 'English',
		hreflang: 'en',
	},
	{
		id: 'fr_FR',
		lang: 'fr-fr',
		pathPrefix: 'fr',
		code: 'FR',
		name: 'Français',
		hreflang: 'fr',
	},
	{
		id: 'de_DE',
		lang: 'de-de',
		pathPrefix: 'de',
		code: 'DE',
		name: 'Deutsch',
		hreflang: 'de',
	},
	{
		id: 'zh_CN',
		lang: 'zh-cn',
		pathPrefix: 'cn',
		code: 'CN',
		name: '中文',
		hreflang: 'zh',
	},
];

export const defaultLocale = supportedLocales[0];

export const getLocaleById = (id: string): SupportedLocale | undefined => {
	return supportedLocales.find(l => l.id === id);
};

export const getLocaleByPathPrefix = (prefix: string): SupportedLocale | undefined => {
	return supportedLocales.find(l => l.pathPrefix === prefix);
};
