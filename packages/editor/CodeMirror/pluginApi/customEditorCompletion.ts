import { EditorState, Facet, Compartment, Extension } from '@codemirror/state';
import { CompletionSource, autocompletion } from '@codemirror/autocomplete';

// CodeMirror 6's built-in autocomplete functionality is difficult to work with
// unless you want to enable languageData-based autocompletion.
//
// This file wraps CodeMirror's built-in `autocompletion` extension and allows plugins
// to provide completions that work regardless of whether languageData-based autocomplete
// is enabled.
//
// See https://discuss.codemirror.net/t/autocompletion-merging-override-in-config/7853

export const editorCompletionSource = Facet.define<CompletionSource, CompletionSource[]>();
export const enableLanguageDataAutocomplete = Facet.define<boolean, boolean[]>();

// Provides languageData OR override autocompletions based on the value of
// the enableLanguageDataAutocomplete facet.
const customEditorCompletion = () => {
	const compartment = new Compartment();

	return [
		compartment.of([]),
		EditorState.transactionExtender.of(transaction => {
			const lastCompletions = transaction.startState.facet(editorCompletionSource) ?? [];
			const completions = transaction.state.facet(editorCompletionSource) ?? [];


			const currentExtension = compartment.get(transaction.state) as Extension[];
			const missingExtension = currentExtension.length === 0 && completions.length > 0;

			const lastEnableLangDataComplete = transaction.startState.facet(enableLanguageDataAutocomplete)[0];
			const enableLangDataComplete = transaction.state.facet(enableLanguageDataAutocomplete)[0];

			const completionsChanged = lastCompletions.length !== completions.length || completions.some((val, idx) => lastCompletions[idx] !== val);
			const useLangDataChanged = lastEnableLangDataComplete !== enableLangDataComplete;

			// Update the autocompletion extension based on the editorCompletionSource
			// facet.
			if (missingExtension || completionsChanged || useLangDataChanged) {
				if (completions.length > 0 || enableLangDataComplete) {
					return {
						effects: compartment.reconfigure([
							completions.map(completion =>
								EditorState.languageData.of(() => [{ autocomplete: completion }]),
							),
							autocompletion(enableLangDataComplete ? {} : {
								override: [...completions],
							}),
						]),
					};
				} else if (!missingExtension) {
					return {
						effects: compartment.reconfigure([]),
					};
				}
			}

			return null;
		}),
	];
};

export default customEditorCompletion;
