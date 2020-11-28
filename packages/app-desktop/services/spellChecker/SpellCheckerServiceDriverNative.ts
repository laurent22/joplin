// Provides spell checking feature via the native Electron built-in spell checker

import SpellCheckerServiceDriverBase from '@joplin/lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';
import { languageCodeOnly, localesFromLanguageCode } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('SpellCheckerServiceDriverNative');

export default class SpellCheckerServiceDriverNative extends SpellCheckerServiceDriverBase {

	private session(): any {
		return bridge().window().webContents.session;
	}

	public get availableLanguages(): string[] {
		return this.session().availableSpellCheckerLanguages;
	}

	// Language can be set to '' to disable spell-checking
	public setLanguage(v: string) {
		// If we pass an empty array, it disables spell checking
		// https://github.com/electron/electron/issues/25228
		if (!v) {
			this.session().setSpellCheckerLanguages('');
			return;
		}

		// The below function will throw an error if the provided language is
		// not supported, so we provide fallbacks.
		// https://github.com/laurent22/joplin/issues/4146
		const languagesToTry = [
			v,
			languageCodeOnly(v),
		].concat(localesFromLanguageCode(languageCodeOnly(v), this.availableLanguages));

		for (const toTry of languagesToTry) {
			try {
				this.session().setSpellCheckerLanguages([toTry]);
				logger.info(`Set effective language from "${v}" to "${toTry}"`);
				return;
			} catch (error) {
				logger.warn(`Failed to set language to "${toTry}". Will try the next one in this list: ${JSON.stringify(languagesToTry)}`);
				logger.warn('Error was:', error);
			}
		}

		logger.error(`Could not set language to: ${v}`);
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
