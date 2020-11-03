export default class SpellCheckerServiceDriverBase {

	public get availableLanguages():string[] {
		throw new Error('Not implemented');
	}

	public setLanguage(_v:string) {
		throw new Error('Not implemented');
	}

	public get language():string {
		throw new Error('Not implemented');
	}

	public makeMenuItem(_item:any):any {
		throw new Error('Not implemented');
	}

	public addWordToSpellCheckerDictionary(_language:string, _word:string) {
		throw new Error('Not implemented');
	}

}
