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
		// This function will add selected languages to the history. History size will be capped at languagesHistorySizeMax,
		// but it can be bigger. Enabled languages will always be in the history, even if it count greater then
		// languagesHistorySizeMax, in such case if one of the languages will be disabled it will disappear from history.
		const languagesHistorySizeMax = 5;
		const languages = this.latestSelectedLanguages_.slice();
		if (!languages.includes(language)) {
			languages.push(language);
		}

		if (languages.length > languagesHistorySizeMax) {
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			this.latestSelectedLanguages_.forEach(l => {
				if (!this.languages.includes(l) && languages.length > languagesHistorySizeMax) languages.splice(languages.indexOf(l), 1);
			});
		}

		this.latestSelectedLanguages_ = languages;
		await KvStore.instance().setValue('spellCheckerService.latestSelectedLanguages', JSON.stringify(this.latestSelectedLanguages_));
	}

	public setupDefaultLanguage() {
		if (Setting.value('spellChecker.languages').length === 0) {
			const l = this.driver_.language;
			if (this.availableLanguages.includes(l)) {
				this.setLanguage(l);
			} else {
				this.setLanguage(this.defaultLanguage);
			}
		}
	}

	public get availableLanguages(): string[] {
		return this.driver_.availableLanguages;
	}

	private applyStateToDriver() {
		this.driver_.setLanguages(this.enabled ? this.languages : []);
	}

	public setLanguage(language: string) {
		let enabledLanguages: string[] = [...this.languages];
		if (enabledLanguages.includes(language)) {
			enabledLanguages = enabledLanguages.filter(obj => obj !== language);
		} else {
			enabledLanguages.push(language);
		}
		Setting.setValue('spellChecker.languages', enabledLanguages);
		this.applyStateToDriver();
		void this.addLatestSelectedLanguage(language);
	}

	public get languages(): string[] {
		return Setting.value('spellChecker.languages');
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
						void CommandService.instance().execute('replaceMisspelling', suggestion);
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
				void this.addToDictionary(this.languages[0], misspelledWord);
			},
		});

		return output;
	}

	private changeLanguageMenuItem(language: string, enabled: boolean, checked: boolean) {
		return {
			label: countryDisplayName(language),
			type: 'checkbox',
			checked: checked,
			enabled: enabled,
			click: () => {
				this.setLanguage(language);
			},
		};
	}

	private changeLanguageMenuItems(selectedLanguages: string[], enabled: boolean) {
		const languageMenuItems = [];

		for (const locale of this.driver_.availableLanguages) {
			languageMenuItems.push(this.changeLanguageMenuItem(locale, enabled, selectedLanguages.includes(locale)));
		}

		languageMenuItems.sort((a: any, b: any) => {
			return a.label < b.label ? -1 : +1;
		});

		return languageMenuItems;
	}

	public spellCheckerConfigMenuItems(selectedLanguages: string[], useSpellChecker: boolean) {
		const latestLanguageItems = this.latestSelectedLanguages_.map((language: string) => {
			return this.changeLanguageMenuItem(language, true, selectedLanguages.includes(language));
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
			// {
			// 	label: '⚠ Spell checker doesn\'t work in Markdown editor ⚠',
			// 	enabled: false,
			// },

			{
				type: 'separator',
			},

			{
				label: _('Change language'),
				submenu: this.changeLanguageMenuItems(selectedLanguages, useSpellChecker),
			},
		];
	}

	public spellCheckerConfigMenuItem(selectedLanguages: string[], useSpellChecker: boolean) {
		return {
			label: _('Spell checker'),
			submenu: this.spellCheckerConfigMenuItems(selectedLanguages, useSpellChecker),
		};
	}

}
