import SpellCheckerServiceDriverBase from 'lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';

export default class SpellCheckerServiceDriver extends SpellCheckerServiceDriverBase {

	private session():any {
		return bridge().window().webContents.session;
	}

	public get availableLanguages():string[] {
		return this.session().availableSpellCheckerLanguages;
	}

	public setLanguage(v:string) {
		this.session().setSpellCheckerLanguages([v]);
	}

	public get language():string {
		const languages = this.session().getSpellCheckerLanguages();
		return languages.length ? languages[0] : '';
	}

	public menuItems<T>(_misspelledWord:string, _dictionarySuggestions:string[]):T[] {
		throw new Error('Not implemented');
	}

	public makeMenuItem(item:any):any {
		const MenuItem = bridge().MenuItem;
		return new MenuItem(item);
	}

	public addWordToSpellCheckerDictionary(_language:string, word:string) {
		// Actually on Electron all languages share the same dictionary, or
		// perhaps it's added to the currently active language.
		this.session().addWordToSpellCheckerDictionary(word);
	}

}
