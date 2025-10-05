
// Copied from https://github.com/eugeny-dementev/parse-gettext-plural-form
// along with the tests
const parsePluralLocalizationForm = (form: string) => {
	const pluralFormRegex = /^(\s*nplurals\s*=\s*[0-9]+\s*;\s*plural\s*=\s*(?:\s|[-?|&=!<>+*/%:;a-zA-Z0-9_()])+)$/m;

	if (!pluralFormRegex.test(form)) throw new Error(`Plural-Forms is invalid: ${form}`);

	if (!/;\s*$/.test(form)) {
		form += ';';
	}

	const code = [
		'var plural;',
		'var nplurals;',
		form,
		'return (plural === true ? 1 : plural ? plural : 0);',
	].join('\n');

	return code;
};

export default parsePluralLocalizationForm;
