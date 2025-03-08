// Provides spell checking feature via the native Electron built-in spell checker

import SpellCheckerServiceDriverBase from '@joplin/lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';
import Logger from '@joplin/utils/Logger';
import { languageCodeOnly, localesFromLanguageCode } from '@joplin/lib/locale';

const logger = Logger.create('SpellCheckerServiceDriverNative');

export default class SpellCheckerServiceDriverNative extends SpellCheckerServiceDriverBase {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private session(): any {
		return bridge().mainWindow().webContents.session;
	}

	public get availableLanguages(): string[] {
		return this.session().availableSpellCheckerLanguages;
	}

	// Language can be set to [] to disable spell-checking
	public setLanguages(v: string[]) {

		// Note that in order to validate the language we need ot set it on the
		// session and check if Electron has thrown an exception or not. This is
		// fine because the actual languages will be set below after the calls
		// to this functions.
		const validateLanguage = (v: string) => {
			const languagesToTry = [
				v,
				languageCodeOnly(v),
			].concat(localesFromLanguageCode(languageCodeOnly(v), this.availableLanguages));

			for (const toTry of languagesToTry) {
				try {
					this.session().setSpellCheckerLanguages([toTry]);
					return toTry;
				} catch (error) {
					logger.warn(`Failed to set language to "${toTry}". Will try the next one in this list: ${JSON.stringify(languagesToTry)}`);
					logger.warn('Error was:', error);
				}
			}

			return null;
		};

		const effectiveLanguages: string[] = [];
		for (const language of v) {
			const effectiveLanguage = validateLanguage(language);
			if (effectiveLanguage) effectiveLanguages.push(effectiveLanguage);
		}

		// If we pass an empty array, it disables spell checking
		// https://github.com/electron/electron/issues/25228

		this.session().setSpellCheckerLanguages(effectiveLanguages);
		this.session().setSpellCheckerEnabled(effectiveLanguages.length > 0);
		logger.info(`Set effective languages to "${effectiveLanguages}"`);
	}

	public get language(): string {
		const languages = this.session().getSpellCheckerLanguages();
		return languages.length ? languages[0] : '';
	}

	public addWordToSpellCheckerDictionary(_language: string, word: string) {
		// Actually on Electron all languages share the same dictionary, or
		// perhaps it's added to the currently active language.
		this.session().addWordToSpellCheckerDictionary(word);
	}

}
