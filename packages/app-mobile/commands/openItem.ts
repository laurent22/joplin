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
import { isCallbackUrl, parseCallbackUrl } from '@joplin/lib/callbackUrlUtils';

const logger = Logger.create('openItemCommand');

export const declaration: CommandDeclaration = {
	name: 'openItem',
};

const openItemById = async (itemId: string, hash?: string) => {
	logger.info(`Navigating to item ${itemId}`);
	const item: BaseItemEntity = await BaseItem.loadItemById(itemId);

	if (item.type_ === ModelType.Note) {
		await goToNote(itemId, hash);
	} else if (item.type_ === ModelType.Resource) {
		await showResource(item);
	} else {
		throw new Error(`Unsupported item type for links: ${item.type_}`);
	}
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, link: string) => {
			if (!link) throw new Error('Link cannot be empty');

			try {
				if (link.startsWith('joplin://') || link.startsWith(':/')) {
					const parsedResourceUrl = parseResourceUrl(link);
					const parsedCallbackUrl = isCallbackUrl(link) ? parseCallbackUrl(link) : null;

					if (parsedResourceUrl) {
						const { itemId, hash } = parsedResourceUrl;
						await openItemById(itemId, hash);
					} else if (parsedCallbackUrl) {
						const id = parsedCallbackUrl.params.id;
						if (!id) {
							throw new Error('Missing item ID');
						}
						await openItemById(id);
					} else {
						throw new Error('Unsupported link format.');
					}
				} else if (urlProtocol(link)) {
					shim.openUrl(link);
				} else {
					throw new Error('Unsupported protocol');
				}
			} catch (error) {
				const errorMessage = _('Unsupported link or message: %s.\nError: %s', link, error);
				logger.error(errorMessage);
				await shim.showErrorDialog(errorMessage);
			}
		},
	};
};
