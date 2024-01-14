
import * as codeMirrorView from '@codemirror/view';
import * as codeMirrorState from '@codemirror/state';
import * as codeMirrorLanguage from '@codemirror/language';
import * as codeMirrorAutocomplete from '@codemirror/autocomplete';
import * as codeMirrorCommands from '@codemirror/commands';
import * as codeMirrorLint from '@codemirror/lint';
import * as lezerHighlight from '@lezer/highlight';
import * as lezerCommon from '@lezer/common';
import * as lezerMarkdown from '@lezer/markdown';
import * as codeMirrorLangHtml from '@codemirror/lang-html';
import * as codeMirrorLanguageData from '@codemirror/language-data';

// Exposes CodeMirror libraries to plugins.
//
// Plugins can't bundle their own copies of the CodeMirror libraries, as multiple
// copies of some libraries can cause issues.
const libraryNameToPackage: Record<string, any> = {
	'@codemirror/view': codeMirrorView,
	'@codemirror/state': codeMirrorState,
	'@codemirror/language': codeMirrorLanguage,
	'@codemirror/autocomplete': codeMirrorAutocomplete,
	'@codemirror/commands': codeMirrorCommands,
	'@codemirror/highlight': lezerHighlight,
	'@codemirror/lint': codeMirrorLint,
	'@codemirror/lang-html': codeMirrorLangHtml,
	'@codemirror/language-data': codeMirrorLanguageData,
	'@lezer/common': lezerCommon,
	'@lezer/markdown': lezerMarkdown,
};

const codeMirrorRequire = (library: string) => {
	// Here, we use hasOwnProperty instead of "in" to prevent
	// require("constructor") or require("__proto__") from returning
	// a constructor or prototype object.
	if (libraryNameToPackage.hasOwnProperty(library)) {
		return libraryNameToPackage[library];
	}

	throw new Error(`Cannot find library ${library}`);
};

export default codeMirrorRequire;
