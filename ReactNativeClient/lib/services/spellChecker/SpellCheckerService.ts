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

	public setDriver(v:SpellCheckerServiceDriverBase) {
		this.driver_ = v;
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

	public setLanguage(v:string) {
		console.info('SET LANGUAGE', v);
		Setting.setValue('spellChecker.language', v);
		this.driver_.setLanguage(v);
	}

	public get language():string {
		return Setting.value('spellChecker.language');
	}

	private makeMenuItem(item:any):any {
		return this.driver_.makeMenuItem(item);
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
				console.info('TODO');
			},
		}));

		return output;
	}

	public changeLanguageMenuItem(selectedLanguage:string, enabled:boolean) {
		const languageMenuItems = [];

		console.info('changeLanguageMenuItem', this.driver_.availableLanguages);

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
