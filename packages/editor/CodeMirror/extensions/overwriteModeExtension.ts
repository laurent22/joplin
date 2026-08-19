import { EditorView, keymap } from '@codemirror/view';
import { StateField, Facet, StateEffect } from '@codemirror/state';
import keyUpHandlerExtension from './keyUpHandlerExtension';

const overwriteModeFacet = Facet.define({
	combine: values => values[0] ?? false,
	enables: facet => [
		EditorView.inputHandler.of((
			view, _from, _to, text, insert,
		) => {
			if (view.composing || view.compositionStarted || view.state.readOnly) {
				return false;
			}

			if (view.state.facet(facet) && text) {
				const originalTransaction = insert();
				const newState1 = originalTransaction.state;
				const emptySelections1 = newState1.selection.ranges.filter(
					range => range.empty,
				);

				view.dispatch([
					originalTransaction,
					newState1.update({
						changes: emptySelections1.map(range => {
							const line = newState1.doc.lineAt(range.to);
							return {
								from: range.to,
								to: Math.min(line.to, range.to + text.length),
								insert: '',
							};
						}).filter(change => change.from !== change.to || change.insert),
					}),
				]);
				return true;
			}
			return false;
		}),
		EditorView.theme({
			'&.-overwrite .cm-cursor': {
				borderLeftWidth: '0.5em',
			},
		}),
	],
});

export const toggleOverwrite = StateEffect.define<boolean>();
const overwriteModeState = StateField.define({
	create: () => false,
	update: (oldValue, tr) => {
		for (const e of tr.effects) {
			if (e.is(toggleOverwrite)) {
				return e.value;
			}
		}
		return oldValue;
	},
	provide: (field) => [
		overwriteModeFacet.from(field),
		EditorView.editorAttributes.from(field, on => ({
			class: on ? '-overwrite' : '',
		})),
	],
});

export const overwriteModeEnabled = (view: EditorView) => {
	return view.state.field(overwriteModeState);
};

const setOverwriteModeEnabled = (enabled: boolean, view: EditorView) => {
	view.dispatch({
		effects: [
			toggleOverwrite.of(enabled),
			EditorView.announce.of(
				// TODO: Localize:
				enabled ? 'Overwrite mode enabled' : 'Overwrite mode disabled',
			),
		],
	});
};

const overwriteModeExtension = [
	overwriteModeState,
	keymap.of([
		{
			// The <escape> keyboard shortcut may be more easily discoverable for users
			// who enter overwrite mode unintentionally.
			key: 'Escape',
			run: (view) => {
				if (overwriteModeEnabled(view)) {
					setOverwriteModeEnabled(false, view);
					return true;
				}
				return false;
			},
		},
	]),
	keyUpHandlerExtension(
		(event) => (
			event.code === 'Insert' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey
		),
		({ view, otherKeysWerePressed }) => {
			if (otherKeysWerePressed) {
				return false;
			}
			setOverwriteModeEnabled(!overwriteModeEnabled(view), view);
			return true;
		},
	),
];

export default overwriteModeExtension;
