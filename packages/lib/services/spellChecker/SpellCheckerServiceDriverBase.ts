export default class SpellCheckerServiceDriverBase {

	public get availableLanguages(): string[] {
		throw new Error('Not implemented');
	}

	public setLanguages(_v: string[]) {
		throw new Error('Not implemented');
	}

	public get language(): string {
		throw new Error('Not implemented');
	}

	public addWordToSpellCheckerDictionary(_language: string, _word: string) {
		throw new Error('Not implemented');
	}

}
