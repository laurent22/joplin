import { Command } from 'prosemirror-state';
import { focus } from '@joplin/lib/utils/focusHandler';

const focusEditor: Command = (_state, _dispatch?, view?) => {
	if (view) {
		focus('commands::focus', view);
	}
	return true;
};

export default focusEditor;
