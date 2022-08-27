// Provides spell checking feature via the native Electron built-in spell checker

import SpellCheckerServiceDriverBase from '@joplin/lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('SpellCheckerServiceDriverNative');

export default class SpellCheckerServiceDriverNative extends SpellCheckerServiceDriverBase {

	private session(): any {
		return bridge().window().webContents.session;
	}

	public get availableLanguages(): string[] {
		return this.session().availableSpellCheckerLanguages;
	}

	// Language can be set to [] to disable spell-checking
	public setLanguages(v: string[]) {
		// If we pass an empty array, it disables spell checking
		// https://github.com/electron/electron/issues/25228
		if (v.length === 0) {
			this.session().setSpellCheckerLanguages([]);
			return;
		}

		this.session().setSpellCheckerLanguages(v);
		logger.info(`Set effective languages to "${v}"`);
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
