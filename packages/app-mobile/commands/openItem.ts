import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
const { parseResourceUrl, urlProtocol } = require('@joplin/lib/urlUtils');
import NavService from '@joplin/lib/services/NavService';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('openItemCommand');

export const declaration: CommandDeclaration = {
	name: 'openItem',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, link: string) => {
			if (!link) throw new Error('Link cannot be empty');

			if (link.startsWith('joplin://') || link.startsWith(':/')) {
				const parsedUrl = parseResourceUrl(link);
				if (parsedUrl) {
					const { itemId, hash } = parsedUrl;

					logger.info(`Navigating to item ${itemId}`);
					await NavService.go('Note', {
						noteId: itemId,
						noteHash: hash,
					});
				} else {
					logger.error(`Invalid Joplin link: ${link}`);
				}
			} else if (urlProtocol(link)) {
				shim.openUrl(link);
			} else {
				const errorMessage = _('Unsupported link or message: %s', link);
				logger.error(errorMessage);
				await shim.showMessageBox(errorMessage);
			}
		},
	};
};
