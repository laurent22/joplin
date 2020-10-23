import Setting from 'lib/models/Setting';
import CommandService from '../CommandService';
import SpellCheckerServiceDriverBase from './SpellCheckerServiceDriverBase';
import { _, countryDisplayName } from 'lib/locale';
import shim from 'lib/shim';

interface Dictionary {
	[language: string]: string[],
}

export default class SpellCheckerService {

	private driver_:SpellCheckerServiceDriverBase;
	private dictionary_:Dictionary = {};
	private scheduleDictionarySaveId_:any;

	private static instance_:SpellCheckerService;

	public static instance():SpellCheckerService {
		if (this.instance_) return this.instance_;
		this.instance_ = new SpellCheckerService();
		return this.instance_;
	}

	public async initialize(driver:SpellCheckerServiceDriverBase) {
		this.driver_ = driver;
		this.setupDefaultLanguage();
		await this.dictionaryLoad();
		this.onLanguageChange(Setting.value('spellChecker.language'));
	}

	private get dictionaryPath():string {
		return `${Setting.value('profileDir')}/dictionary.json`;
	}

	private scheduleDictionarySave() {
		if (this.scheduleDictionarySaveId_) shim.clearTimeout(this.scheduleDictionarySaveId_);

		this.scheduleDictionarySaveId_ = shim.setTimeout(() => {
			this.scheduleDictionarySaveId_ = null;
			const data:string = JSON.stringify(this.dictionary_);
			shim.fsDriver().writeFile(this.dictionaryPath, data, 'utf8');
		}, 500);
	}

	public async dictionaryLoad() {
		if (!(await shim.fsDriver().exists(this.dictionaryPath))) return;

		const data = await shim.fsDriver().readFile(this.dictionaryPath, 'utf8');
		if (!data) return;

		const parsed = JSON.parse(data);
		if (!parsed) return;

		this.dictionary_ = parsed;
	}

	private dictionaryWords(language:string) {
		if (!this.dictionary_[language]) return [];
		return this.dictionary_[language];
	}

	private get defaultLanguage():string {
		return 'en-US';
	}

	public setupDefaultLanguage() {
		if (!Setting.value('spellChecker.language')) {
			const l = this.driver_.language;
			this.setLanguage(l ? l : this.defaultLanguage);
		}
	}

	public get availableLanguages():string[] {
		return this.driver_.availableLanguages;
	}

	private onLanguageChange(language:string) {
		const words = this.dictionaryWords(language);

		for (const word of words) {
			this.driver_.addWordToSpellCheckerDictionary(language, word);
		}

		this.driver_.setLanguage(language);
	}

	public setLanguage(language:string) {
		Setting.setValue('spellChecker.language', language);
		this.onLanguageChange(language);
	}

	public get language():string {
		return Setting.value('spellChecker.language');
	}

	private makeMenuItem(item:any):any {
		return this.driver_.makeMenuItem(item);
	}

	private async addToDictionary(language:string, word:string) {
		if (!this.dictionary_[language]) this.dictionary_[language] = [];
		if (this.dictionary_[language].includes(word)) return;

		this.driver_.addWordToSpellCheckerDictionary(language, word);
		this.dictionary_[language].push(word);
		this.scheduleDictionarySave();
	}

	public contextMenuItems<T>(misspelledWord:string, dictionarySuggestions:string[]):T[] {
		if (!misspelledWord) return [];

		const output = [];

		output.push(this.makeMenuItem({ type: 'separator' }));

		if (dictionarySuggestions.length) {
			for (const suggestion of dictionarySuggestions) {
				output.push(this.makeMenuItem({
					label: suggestion,
					click: () => {
						CommandService.instance().execute('replaceSelection', suggestion);
					},
				}));
			}
		} else {
			output.push(this.makeMenuItem({
				label: `(${_('No suggestions')})`,
				enabled: false,
				click: () => {},
			}));
		}

		output.push(this.makeMenuItem({ type: 'separator' }));

		output.push(this.makeMenuItem({
			label: _('Add to dictionary'),
			click: () => {
				this.addToDictionary(this.language, misspelledWord);
			},
		}));

		return output;
	}

	public changeLanguageMenuItem(selectedLanguage:string, enabled:boolean) {
		const languageMenuItems = [];

		for (const locale of this.driver_.availableLanguages) {
			languageMenuItems.push({
				label: countryDisplayName(locale),
				type: 'radio',
				checked: locale === selectedLanguage,
				click: () => {
					this.setLanguage(locale);
				},
			});
		}

		languageMenuItems.sort((a:any, b:any) => {
			return a.label < b.label ? -1 : +1;
		});

		return this.makeMenuItem({
			label: _('Change spell checker language'),
			enabled: enabled,
			submenu: languageMenuItems.map((item:any) => this.makeMenuItem(item)),
		});
	}

}
