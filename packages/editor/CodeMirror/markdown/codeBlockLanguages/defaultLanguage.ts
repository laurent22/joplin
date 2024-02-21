import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';

// To allow auto-indent to work in an unrecognised language, we define a language
// that provides just autoindent.
const defaultLangauge = StreamLanguage.define({
	startState: (indentUnit) => {
		return {
			indentUnit,
			lastIndent: 0,
			isLineStart: true,
		};
	},
	token: (stream, state) => {
		if (state.isLineStart) {
			const indent = stream.eat(/\s*/) || '';
			state.lastIndent = indent.length;
			state.isLineStart = false;
		} else {
			const n = stream.next();
			if (n === '\n') {
				state.isLineStart = true;
			}
		}
		return null;
	},
	indent: (state) => {
		return state.lastIndent;
	},
});

const baseLanguageDescription = LanguageDescription.of({
	name: 'default',
	support: new LanguageSupport(defaultLangauge),
});

export default baseLanguageDescription;
