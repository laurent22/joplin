import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';
import { WindowCommandDependencies } from '../utils/types';

export const declaration: CommandDeclaration = {
	name: 'focusElementToolbar',
	label: () => _('Toolbar'),
	parentLabel: () => _('Focus'),
};

export const runtime = (dependencies: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async () => {
			if (!dependencies || !dependencies.containerRef || !dependencies.containerRef.current) return;

			const firstButtonOnRTEToolbar = dependencies.containerRef.current.querySelector(
				'.tox-toolbar__group button',
			);

			if (firstButtonOnRTEToolbar) {
				focus('focusElementToolbar', firstButtonOnRTEToolbar);
				return;
			}

			const firstButtonOnMarkdownToolbar = dependencies.containerRef.current.querySelector(
				'#CodeMirrorToolbar .button:not(.disabled)',
			);

			if (firstButtonOnMarkdownToolbar) {
				focus('focusElementToolbar', firstButtonOnMarkdownToolbar);
			}

		},
	};
};
