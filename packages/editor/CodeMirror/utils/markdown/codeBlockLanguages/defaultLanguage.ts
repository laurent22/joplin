import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';

// To allow auto-indent to work in an unrecognised language, we define an
// empty language. Doing so seems to enable auto-indent in code blocks with
// that language.
const defaultLanguage = StreamLanguage.define({
	token: (stream) => {
		stream.next();
		return null;
	},
});

const defaultLanguageDescription = LanguageDescription.of({
	name: 'default',
	support: new LanguageSupport(defaultLanguage),
});

export default defaultLanguageDescription;
