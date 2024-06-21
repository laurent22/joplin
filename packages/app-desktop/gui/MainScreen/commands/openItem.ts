import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import { openItemById } from '../../NoteEditor/utils/contextMenu';
import { fileUrlToResourceUrl, parseResourceUrl, urlProtocol } from '@joplin/lib/urlUtils';
import { fileUriToPath } from '@joplin/utils/url';
import { urlDecode } from '@joplin/lib/string-utils';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'openItem',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, link: string) => {
			if (!link) throw new Error('Link cannot be empty');

			const fromFileUrl = fileUrlToResourceUrl(link, Setting.value('resourceDir'));
			if (fromFileUrl) {
				link = fromFileUrl;
			}

			if (link.startsWith('joplin://') || link.startsWith(':/')) {
				const parsedUrl = parseResourceUrl(link);
				if (parsedUrl) {
					const { itemId, hash } = parsedUrl;
					await openItemById(itemId, context.dispatch, hash);
				} else {
					void bridge().openExternal(link);
				}
			} else if (urlProtocol(link)) {
				if (link.indexOf('file://') === 0) {
					// When using the file:// protocol, openPath doesn't work (does
					// nothing) with URL-encoded paths.
					//
					// shell.openPath seems to work with file:// urls on Windows,
					// but doesn't on macOS, so we need to convert it to a path
					// before passing it to openPath.
					const decodedPath = fileUriToPath(urlDecode(link), shim.platformName());
					void bridge().openItem(decodedPath);
				} else {
					void bridge().openExternal(link);
				}
			} else {
				bridge().showErrorMessageBox(_('Unsupported link or message: %s', link));
			}
		},
	};
};
