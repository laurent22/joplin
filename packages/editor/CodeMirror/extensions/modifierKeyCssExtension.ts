import { StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

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
				const ctrlOrCmdPressed = event.ctrlKey || event.metaKey;
				if (ctrlOrCmdPressed !== view.state.field(ctrlOrMetaPressedField)) {
					view.dispatch({
						effects: [
							ctrlOrMetaChangedEffect.of(ctrlOrCmdPressed),
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
