import { StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorSettingsFacet } from './editorSettingsExtension';

// On MacOS: Tracks the meta key
// On other platforms: Tracks the ctrl key.
const ctrlOrMetaChangedEffect = StateEffect.define<boolean>();

const ctrlOrMetaPressedField = StateField.define<boolean>({
	create: () => false,
	update: (value: boolean, transaction: Transaction) => {
		const toggleEffect = transaction.effects.find(effect => effect.is(ctrlOrMetaChangedEffect));
		if (toggleEffect) {
			return toggleEffect.value;
		}
		return value;
	},
	provide: (field) => [
		EditorView.editorAttributes.from(field, on => ({
			class: on ? '-ctrl-or-cmd-pressed' : '',
		})),
		...(() => {
			const onEvent = (event: KeyboardEvent|MouseEvent, view: EditorView) => {
				const editorSettings = view.state.facet(editorSettingsFacet);
				const hasModifier = editorSettings.preferMacShortcuts ? event.metaKey : event.ctrlKey;

				if (hasModifier !== view.state.field(ctrlOrMetaPressedField)) {
					view.dispatch({
						effects: [
							ctrlOrMetaChangedEffect.of(hasModifier),
						],
					});
				}
			};

			return [
				EditorView.domEventObservers({
					keydown: onEvent,
					keyup: onEvent,
					mouseenter: onEvent,
					mousemove: onEvent,
				}),
			];
		})(),
	],
});

export default [
	ctrlOrMetaPressedField,
];
