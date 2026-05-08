import { Command, EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node } from 'prosemirror-model';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/

type EditRequest = {
	nodeStart: number;
	showEditor: true;
} | {
	nodeStart?: undefined;
	showEditor: false;
};

interface PluginState {
	editingNodeAt: number|null;
}

interface EditorDialog {
	onPositionChange: (position: number)=> void;
	dismiss: ()=> void;
}

export type OnHide = ()=> void;
interface Options {
	canEdit: (node: Node, pos: number)=> boolean;
	showEditor: (pos: number, view: EditorView, onHide: OnHide)=> EditorDialog;
}

const createExternalEditorPlugin = (options: Options) => {
	const plugin = new Plugin<PluginState>({
		state: {
			init: () => ({
				editingNodeAt: null,
			}),
			apply: (tr, oldValue) => {
				let editingAt = oldValue.editingNodeAt;

				const editRequest: EditRequest|null = tr.getMeta(plugin);
				if (editRequest) {
					if (editRequest.showEditor) {
						editingAt = editRequest.nodeStart;
					} else {
						editingAt = null;
					}
				}

				if (editingAt) {
					editingAt = tr.mapping.map(editingAt, 1);
				}
				return { editingNodeAt: editingAt };
			},
		},
		view: () => {
			let dialog: EditorDialog|null = null;

			return {
				update(view, prevState) {
					const oldState = plugin.getState(prevState);
					const newState = plugin.getState(view.state);

					if (newState.editingNodeAt !== null) {
						if (oldState.editingNodeAt === null) {
							const onHide = () => {
								hideEditor(view.state, view.dispatch, view);
							};
							dialog = options.showEditor(newState.editingNodeAt, view, onHide);
						}
						dialog?.onPositionChange(newState.editingNodeAt);
					} else if (dialog) {
						const lastDialog = dialog;
						// Set dialog to null before dismissing to prevent infinite recursion.
						// Dismissing the dialog can cause the editor state to update, which can
						// result in this callback being re-run.
						dialog = null;

						lastDialog.dismiss();
					}
				},
			};
		},
	});

	const editAt = (nodeStart: number): Command => (state, dispatch) => {
		const node = state.doc.nodeAt(nodeStart);
		if (!options.canEdit(node, nodeStart)) {
			return false;
		}

		if (dispatch) {
			const editRequest: EditRequest = {
				nodeStart,
				showEditor: true,
			};
			dispatch(state.tr.setMeta(plugin, editRequest));
		}

		return true;
	};

	const isEditorVisible = (state: EditorState) => {
		return plugin.getState(state).editingNodeAt !== null;
	};

	const hideEditor: Command = (state, dispatch) => {
		const isEditing = isEditorVisible(state);
		if (!isEditing) {
			return false;
		}

		if (dispatch) {
			const editRequest: EditRequest = {
				showEditor: false,
			};
			dispatch(state.tr.setMeta(plugin, editRequest));
		}

		return true;
	};

	return { plugin, hideEditor, editAt, isEditorVisible };
};

export default createExternalEditorPlugin;
