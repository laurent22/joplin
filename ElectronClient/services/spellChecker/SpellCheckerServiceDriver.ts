import SpellCheckerServiceDriverBase from 'lib/services/spellChecker/SpellCheckerServiceDriverBase';
import bridge from '../bridge';

export default class SpellCheckerServiceDriver extends SpellCheckerServiceDriverBase {

	public get availableLanguages():string[] {
		return bridge().window().webContents.session.availableSpellCheckerLanguages;
	}

	public setLanguage(v:string) {
		bridge().window().webContents.session.setSpellCheckerLanguages([v]);
	}

	public get language():string {
		const languages = bridge().window().webContents.session.getSpellCheckerLanguages();
		return languages.length ? languages[0] : '';
	}

	public menuItems<T>(_misspelledWord:string, _dictionarySuggestions:string[]):T[] {
		throw new Error('Not implemented');
	}

	public makeMenuItem(item:any):any {
		const MenuItem = bridge().MenuItem;
		return new MenuItem(item);
	}

}
