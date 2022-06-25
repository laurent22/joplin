export default class SpellCheckerServiceDriverBase {

	public get availableLanguages(): string[] {
		throw new Error('Not implemented');
	}

	public setLanguage(_v: any) {
		throw new Error('Not implemented');
	}

	public get language(): string {
		throw new Error('Not implemented');
	}

	public addWordToSpellCheckerDictionary(_word: string, _language?: string) {
		throw new Error('Not implemented');
	}

}
