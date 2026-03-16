// Provides spell checking feature via the native Electron built-in spell checker

import SpellCheckerServiceDriverBase from '@joplin/lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';
import Logger from '@joplin/utils/Logger';
import { languageCodeOnly, localesFromLanguageCode } from '@joplin/lib/locale';
import { pathExists, readFile, appendFile } from 'fs-extra';
import { join } from 'path';

const logger = Logger.create('SpellCheckerServiceDriverNative');

const dictionaryFilename = 'Custom Dictionary.txt';

export default class SpellCheckerServiceDriverNative extends SpellCheckerServiceDriverBase {

	private profileDir_: string;

	public constructor(profileDir: string) {
		super();
		this.profileDir_ = profileDir;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private session(): any {
		return bridge().mainWindow().webContents.session;
	}

	private dictionaryFilePath(): string {
		return join(this.profileDir_, dictionaryFilename);
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

	public async loadSavedWords() {
		const filePath = this.dictionaryFilePath();
		if (!(await pathExists(filePath))) return;

		const content = await readFile(filePath, 'utf8');
		const words = content.split('\n').map(w => w.trim()).filter(w => w.length > 0);

		for (const word of words) {
			this.session().addWordToSpellCheckerDictionary(word);
		}

		logger.info(`Loaded ${words.length} word(s) from custom dictionary at: ${filePath}`);
	}

	private async saveWordToFile(word: string) {
		const filePath = this.dictionaryFilePath();
		try {
			const existingContent = (await pathExists(filePath))
				? await readFile(filePath, 'utf8')
				: '';

			const existingWords = existingContent
				.split('\n')
				.map(w => w.trim())
				.filter(w => w.length > 0);

			if (existingWords.includes(word)) return;

			await appendFile(filePath, `${word}\n`, 'utf8');
		} catch (error) {
			logger.error('Failed to save word to custom dictionary:', error);
		}
	}

	public addWordToSpellCheckerDictionary(_language: string, word: string) {
		// Actually on Electron all languages share the same dictionary, or
		// perhaps it's added to the currently active language.
		this.session().addWordToSpellCheckerDictionary(word);

		// Persist the word to the profile directory so it survives
		// independently of Electron's userData path, making it portable.
		void this.saveWordToFile(word);
	}

}
