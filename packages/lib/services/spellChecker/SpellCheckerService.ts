import Setting from '../../models/Setting';
import CommandService from '../CommandService';
import SpellCheckerServiceDriverBase from './SpellCheckerServiceDriverBase';
import { _, countryDisplayName } from '../../locale';
import KvStore from '../KvStore';

export default class SpellCheckerService {

	private driver_: SpellCheckerServiceDriverBase;
	private latestSelectedLanguages_: string[] = [];

	private static instance_: SpellCheckerService;

	public static instance(): SpellCheckerService {
		if (this.instance_) return this.instance_;
		this.instance_ = new SpellCheckerService();
		return this.instance_;
	}

	public async initialize(driver: SpellCheckerServiceDriverBase) {
		this.driver_ = driver;
		this.latestSelectedLanguages_ = await this.loadLatestSelectedLanguages();
		this.setupDefaultLanguage();
		this.applyStateToDriver();
	}

	private get defaultLanguage(): string {
		return 'en-US';
	}

	private async loadLatestSelectedLanguages(): Promise<string[]> {
		const result = await KvStore.instance().value<string>('spellCheckerService.latestSelectedLanguages');
		if (!result) return [];
		return JSON.parse(result);
	}

	private async addLatestSelectedLanguage(language: string) {
		const languages = this.latestSelectedLanguages_.slice();
		if (languages.length > 5) languages.splice(0, 1);

		if (languages.includes(language)) {
			languages.splice(languages.indexOf(language), 1);
		}

		languages.splice(0, 0, language);

		this.latestSelectedLanguages_ = languages;
		await KvStore.instance().setValue('spellCheckerService.latestSelectedLanguages', JSON.stringify(this.latestSelectedLanguages_));
	}

	public setupDefaultLanguage() {
		if (!Setting.value('spellChecker.language')) {
			const l = this.driver_.language;
			this.setLanguage(l ? l : this.defaultLanguage);
		}
	}

	public get availableLanguages(): string[] {
		return this.driver_.availableLanguages;
	}

	private applyStateToDriver() {
		this.driver_.setLanguage(this.enabled ? this.language : '');
	}

	public setLanguage(language: string) {
		Setting.setValue('spellChecker.language', language);
		this.applyStateToDriver();
		this.addLatestSelectedLanguage(language);
	}

	public get language(): string {
		return Setting.value('spellChecker.language');
	}

	public get enabled(): boolean {
		return Setting.value('spellChecker.enabled');
	}

	public toggleEnabled() {
		Setting.toggle('spellChecker.enabled');
		this.applyStateToDriver();
	}

	private async addToDictionary(language: string, word: string) {
		this.driver_.addWordToSpellCheckerDictionary(language, word);
	}

	public contextMenuItems(misspelledWord: string, dictionarySuggestions: string[]): any[] {
		if (!misspelledWord) return [];

		const output = [];

		output.push({ type: 'separator' });

		if (dictionarySuggestions.length) {
			for (const suggestion of dictionarySuggestions) {
				output.push({
					label: suggestion,
					click: () => {
						CommandService.instance().execute('replaceSelection', suggestion);
					},
				});
			}
		} else {
			output.push({
				label: `(${_('No suggestions')})`,
				enabled: false,
				click: () => {},
			});
		}

		output.push({ type: 'separator' });

		output.push({
			label: _('Add to dictionary'),
			click: () => {
				this.addToDictionary(this.language, misspelledWord);
			},
		});

		return output;
	}

	private changeLanguageMenuItem(language: string, enabled: boolean, checked: boolean) {
		return {
			label: countryDisplayName(language),
			type: 'radio',
			checked: checked,
			enabled: enabled,
			click: () => {
				this.setLanguage(language);
			},
		};
	}

	private changeLanguageMenuItems(selectedLanguage: string, enabled: boolean) {
		const languageMenuItems = [];

		for (const locale of this.driver_.availableLanguages) {
			languageMenuItems.push(this.changeLanguageMenuItem(locale, enabled, locale === selectedLanguage));
		}

		languageMenuItems.sort((a: any, b: any) => {
			return a.label < b.label ? -1 : +1;
		});

		return languageMenuItems;
	}

	public spellCheckerConfigMenuItems(selectedLanguage: string, useSpellChecker: boolean) {
		const latestLanguageItems = this.latestSelectedLanguages_.map((language: string) => {
			return this.changeLanguageMenuItem(language, true, language === selectedLanguage);
		});

		if (latestLanguageItems.length) latestLanguageItems.splice(0, 0, { type: 'separator' } as any);

		latestLanguageItems.sort((a: any, b: any) => {
			return a.label < b.label ? -1 : +1;
		});

		return [
			{
				label: _('Use spell checker'),
				type: 'checkbox',
				checked: useSpellChecker,
				click: () => {
					this.toggleEnabled();
				},
			},

			...latestLanguageItems,

			{
				type: 'separator',
			},

			// Can be removed once it does work
			{
				label: '⚠ Spell checker doesn\'t work in Markdown editor ⚠',
				enabled: false,
			},

			{
				type: 'separator',
			},

			{
				label: _('Change language'),
				submenu: this.changeLanguageMenuItems(selectedLanguage, useSpellChecker),
			},
		];
	}

	public spellCheckerConfigMenuItem(selectedLanguage: string, useSpellChecker: boolean) {
		return {
			label: _('Spell checker'),
			submenu: this.spellCheckerConfigMenuItems(selectedLanguage, useSpellChecker),
		};
	}

}
