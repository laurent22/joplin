import markupLanguageUtils from '../markupLanguageUtils';
import Setting from '../models/Setting';
import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import shim from '../shim';
import { themeStyle } from '../theme';
import attachedResources from '../utils/attachedResources';
import { MarkupLanguage } from '@joplin/renderer';
import { Options } from '@joplin/renderer/MdToHtml';
import { RenderOptions } from '@joplin/renderer/types';

export const declaration: CommandDeclaration = {
	name: 'renderMarkup',
};

const getMarkupToHtml = () => {
	// In the desktop app, resources accessed with file:// URLs can't be displayed in certain places (e.g. the note
	// viewer and plugin WebViews). On mobile, however, joplin-content:// URLs don't work. As such, use different
	// protocols on different platforms:
	const protocol = shim.isElectron() ? 'joplin-content://note-viewer/' : 'file://';

	return markupLanguageUtils.newMarkupToHtml({}, {
		resourceBaseUrl: `${protocol}${Setting.value('resourceDir')}/`,
		customCss: '',
	});
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, markupLanguage: MarkupLanguage, markup: string, _rendererOptions: Options = null, renderOptions: RenderOptions = null) => {
			const markupToHtml = getMarkupToHtml();

			try {
				const html = await markupToHtml.render(markupLanguage, markup, themeStyle(Setting.value('theme')), {
					...renderOptions,
					resources: await attachedResources(markup),
					splitted: true,
				});
				return html;
			} catch (error) {
				error.message = `Could not render markup: markupLanguage: ${markupLanguage} Markup: ${markup}: ${error.message}`;
				throw error;
			}
		},
	};
};
