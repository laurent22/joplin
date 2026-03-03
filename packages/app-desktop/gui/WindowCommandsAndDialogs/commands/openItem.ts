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
			} else if (link.indexOf('file://') === 0) {
				// When using the file:// protocol, openPath doesn't work (does
				// nothing) with URL-encoded paths.
				//
				// shell.openPath seems to work with file:// urls on Windows,
				// but doesn't on macOS, so we need to convert it to a path
				// before passing it to openPath.
				let decoded = urlDecode(link);

				// On Windows, UNC paths like file://\\server\share have backslashes
				// right after file:// which makes the URL invalid. Convert them
				// to forward slashes so fileUriToPath can handle them correctly.
				// https://github.com/laurent22/joplin/issues/14196
				if (decoded.startsWith('file://\\')) {
					decoded = `file://${decoded.substring(7).replace(/\\/g, '/')}`;
				}

				const decodedPath = fileUriToPath(decoded, shim.platformName());
				void bridge().openItem(decodedPath);
			} else if (urlProtocol(link)) {
				void bridge().openExternal(link);
			} else {
				bridge().showErrorMessageBox(_('Unsupported link or message: %s', link));
			}
		},
	};
};
