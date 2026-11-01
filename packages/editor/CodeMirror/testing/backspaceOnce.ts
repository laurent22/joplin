import pressReleaseKey from './pressReleaseKey';
import { EditorView } from '@codemirror/view';

const backspaceOnce = (view: EditorView) => {
	pressReleaseKey(view, { key: 'Backspace', code: 'Backspace', typesText: '' });
};

export default backspaceOnce;
