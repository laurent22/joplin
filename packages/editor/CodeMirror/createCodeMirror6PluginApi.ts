import { EditorView } from '@codemirror/view';
import * as codeMirrorView from '@codemirror/view';
import * as codeMirrorState from '@codemirror/state';
import * as codeMirrorLanguage from '@codemirror/language';
import * as codeMirrorAutocomplete from '@codemirror/autocomplete';
import * as codeMirrorCommands from '@codemirror/commands';
import * as lezerHighlight from '@lezer/highlight';
import * as lezerCommon from '@lezer/common';
import * as lezerMarkdown from '@lezer/markdown';

// CodeMirror 6 relies on objects/commands having a single instance. Bundling/including
// the CodeMirror library twice or more times breaks this assumption.
//
// As such, we export these packages with the main plugin API.
//
const createCodeMirror6PluginApi = (view: EditorView) => {
	return {
		view,

		codemirror: {
			view: codeMirrorView,
			state: codeMirrorState,
			language: codeMirrorLanguage,
			autocomplete: codeMirrorAutocomplete,
			commands: codeMirrorCommands,
		},

		lezer: {
			highlight: lezerHighlight,
			common: lezerCommon,
			markdown: lezerMarkdown,
		},
	};
};

export default createCodeMirror6PluginApi;
