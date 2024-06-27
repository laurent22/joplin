import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import { parseResourceUrl, urlProtocol } from '@joplin/lib/urlUtils';
import Logger from '@joplin/utils/Logger';
import goToNote from './util/goToNote';
import BaseItem from '@joplin/lib/models/BaseItem';
import { BaseItemEntity } from '@joplin/lib/services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';
import showResource from './util/showResource';

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
					const item: BaseItemEntity = await BaseItem.loadItemById(itemId);
					if (item.type_ === ModelType.Note) {
						await goToNote(itemId, hash);
					} else if (item.type_ === ModelType.Resource) {
						await showResource(item);
					} else {
						logger.error('Unsupported item type for links:', item.type_);
					}
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
