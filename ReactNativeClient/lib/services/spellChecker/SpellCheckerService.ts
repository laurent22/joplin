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
		this.applyStateToDriver();
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

	private applyStateToDriver() {
		this.driver_.setLanguage(this.enabled ? this.language : '');
	}

	public setLanguage(language:string) {
		Setting.setValue('spellChecker.language', language);
		this.applyStateToDriver();
	}

	public get language():string {
		return Setting.value('spellChecker.language');
	}

	public get enabled():boolean {
		return Setting.value('spellChecker.enabled');
	}

	public toggleEnabled() {
		Setting.toggle('spellChecker.enabled');
		this.applyStateToDriver();
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

	private changeLanguageMenuItems(selectedLanguage:string, enabled:boolean) {
		const languageMenuItems = [];

		for (const locale of this.driver_.availableLanguages) {
			languageMenuItems.push({
				label: countryDisplayName(locale),
				type: 'radio',
				checked: locale === selectedLanguage,
				enabled: enabled,
				click: () => {
					this.setLanguage(locale);
				},
			});
		}

		languageMenuItems.sort((a:any, b:any) => {
			return a.label < b.label ? -1 : +1;
		});

		return languageMenuItems.map((item:any) => this.makeMenuItem(item));
	}

	public spellCheckerConfigMenuItem(selectedLanguage:string, useSpellChecker:boolean) {
		return this.makeMenuItem({
			label: _('Spell checker'),
			submenu: [
				this.makeMenuItem({
					label: _('Use spell checker'),
					type: 'checkbox',
					checked: useSpellChecker,
					click: () => {
						this.toggleEnabled();
					},
				}),
				this.makeMenuItem({
					type: 'separator',
				}),

				// Can be removed once it does work
				this.makeMenuItem({
					label: '⚠ Spell checker doesn\'t work in Markdown editor ⚠',
					enabled: false,
				}),

				this.makeMenuItem({
					type: 'separator',
				}),
				...this.changeLanguageMenuItems(selectedLanguage, useSpellChecker),
			],
		});
	}

}
