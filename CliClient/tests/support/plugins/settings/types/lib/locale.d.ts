interface StringToStringMap {
    [key: string]: string;
}
declare function defaultLocale(): string;
declare function supportedLocales(): string[];
interface SupportedLocalesToLanguagesOptions {
    includeStats?: boolean;
}
declare function supportedLocalesToLanguages(options?: SupportedLocalesToLanguagesOptions): StringToStringMap;
declare function closestSupportedLocale(canonicalName: string, defaultToEnglish?: boolean, locales?: string[]): string;
declare function countryCodeOnly(canonicalName: string): string;
declare function countryDisplayName(canonicalName: string): string;
declare function localeStrings(canonicalName: string): any;
declare function setLocale(canonicalName: string): void;
declare function languageCode(): string;
declare function _(s: string, ...args: any[]): any;
declare function _n(singular: string, plural: string, n: number, ...args: any[]): any;
export { _, _n, supportedLocales, countryDisplayName, localeStrings, setLocale, supportedLocalesToLanguages, defaultLocale, closestSupportedLocale, languageCode, countryCodeOnly };
