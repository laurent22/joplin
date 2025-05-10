import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { clipboard } from 'electron';

export const declaration: CommandDeclaration = {
	name: 'copyToClipboard',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context, content: string) => {
			if (!content || (typeof content !== 'string')) return;
			clipboard.writeText(content);
		},
	};
};
