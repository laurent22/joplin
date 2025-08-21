import { EditorView } from '@codemirror/view';
import modifierKeyCssExtension from './modifierKeyCssExtension';
import { syntaxTree } from '@codemirror/language';
import getCheckboxAtPosition from '../utils/markdown/getCheckboxAtPosition';
import toggleCheckboxAt from '../utils/markdown/toggleCheckboxAt';
import ctrlClickActionExtension from './ctrlClickActionExtension';


const ctrlClickCheckboxExtension = () => {
	return [
		modifierKeyCssExtension,
		EditorView.theme({
			'&.-ctrl-or-cmd-pressed .cm-taskMarker': {
				cursor: 'pointer',
			},
		}),
		ctrlClickActionExtension((view, event) => {
			const target = view.posAtCoords(event);
			const taskMarker = getCheckboxAtPosition(target, syntaxTree(view.state));

			if (taskMarker) {
				toggleCheckboxAt(target)(view);
				return true;
			}
			return false;
		}),
	];
};

export default ctrlClickCheckboxExtension;
