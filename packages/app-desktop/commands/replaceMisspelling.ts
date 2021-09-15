import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { AppState } from '../app.reducer';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'replaceMisspelling',
};

function isInsideContainer(node: any, className: string): boolean {
	while (node) {
		if (node.classList && node.classList.contains(className)) return true;
		node = node.parentNode;
	}
	return false;
}

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, suggestion: string) => {
			const state = context.state as AppState;
			const modalDialogVisible = !!Object.keys(state.visibleDialogs).length;

			// If we're inside one of the editors, we need to use their own
			// replaceSelection command to set the suggested word. Outside of
			// it, we can use the Chrome built-in replaceMisspelling function,
			// which will work in any standard text input.

			const activeElement = document.activeElement;
			if (!modalDialogVisible && (isInsideContainer(activeElement, 'codeMirrorEditor') || isInsideContainer(activeElement, 'tox-edit-area__iframe'))) {
				await CommandService.instance().execute('replaceSelection', suggestion);
			} else {
				bridge().window().webContents.replaceMisspelling(suggestion);
			}
		},
	};
};
