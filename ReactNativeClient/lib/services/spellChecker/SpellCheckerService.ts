import Setting from 'lib/models/Setting';
import CommandService from '../CommandService';
import SpellCheckerServiceDriverBase from './SpellCheckerServiceDriverBase';
import { _, countryDisplayName } from 'lib/locale';

export default class SpellCheckerService {

	private driver_:SpellCheckerServiceDriverBase;

	private static instance_:SpellCheckerService;

	public static instance():SpellCheckerService {
		if (this.instance_) return this.instance_;
		this.instance_ = new SpellCheckerService();
		return this.instance_;
	}

	public async initialize(driver:SpellCheckerServiceDriverBase) {
		this.driver_ = driver;
		this.setupDefaultLanguage();
		this.onLanguageChange(Setting.value('spellChecker.language'));
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
		this.driver_.addWordToSpellCheckerDictionary(language, word);
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
