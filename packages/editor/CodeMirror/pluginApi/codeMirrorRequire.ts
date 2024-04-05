
import * as codeMirrorView from '@codemirror/view';
import * as codeMirrorState from '@codemirror/state';
import * as codeMirrorSearch from '@codemirror/search';
import * as codeMirrorLanguage from '@codemirror/language';
import * as codeMirrorAutocomplete from '@codemirror/autocomplete';
import * as codeMirrorCommands from '@codemirror/commands';
import * as codeMirrorLint from '@codemirror/lint';
import * as codeMirrorLangHtml from '@codemirror/lang-html';
import * as codeMirrorLangMarkdown from '@codemirror/lang-markdown';
import * as codeMirrorLanguageData from '@codemirror/language-data';

import * as lezerHighlight from '@lezer/highlight';
import * as lezerCommon from '@lezer/common';
import * as lezerMarkdown from '@lezer/markdown';


// Exposes CodeMirror libraries to plugins.
//
// Plugins can't bundle their own copies of the CodeMirror libraries, as multiple
// copies of some libraries can cause issues.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const libraryNameToPackage: Record<string, any> = {
	'@codemirror/view': codeMirrorView,
	'@codemirror/state': codeMirrorState,
	'@codemirror/search': codeMirrorSearch,
	'@codemirror/language': codeMirrorLanguage,
	'@codemirror/autocomplete': codeMirrorAutocomplete,
	'@codemirror/commands': codeMirrorCommands,
	'@codemirror/lint': codeMirrorLint,
	'@codemirror/lang-html': codeMirrorLangHtml,
	'@codemirror/lang-markdown': codeMirrorLangMarkdown,
	'@codemirror/language-data': codeMirrorLanguageData,

	'@lezer/common': lezerCommon,
	'@lezer/markdown': lezerMarkdown,
	'@lezer/highlight': lezerHighlight,
};

const codeMirrorRequire = (library: string) => {
	// Here, we use hasOwnProperty instead of "in" to prevent
	// require("constructor") or require("__proto__") from returning
	// a constructor or prototype object.
	if (libraryNameToPackage.hasOwnProperty(library)) {
		return libraryNameToPackage[library];
	}

	// Although window.require doesn't work on mobile, some desktop-only plugins
	// originally developed for CodeMirror 5 rely on it.
	if (typeof window.require === 'function') {
		return window.require(library);
	}

	throw new Error(`Cannot find library ${library}`);
};

export default codeMirrorRequire;
