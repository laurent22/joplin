import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useCallback, useMemo } from 'react';
import markupLanguageUtils from '../../../utils/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';

const { themeStyle } = require('@joplin/lib/theme');
import Note from '@joplin/lib/models/Note';
import { MarkupToHtmlOptions } from './types';

interface HookDependencies {
	themeId: number;
	customCss: string;
	plugins: PluginStates;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settingValue: (pluginId: string, key: string)=> any;
	whiteBackgroundNoteRendering: boolean;
}

export default function useMarkupToHtml(deps: HookDependencies) {
	const { themeId, customCss, plugins, whiteBackgroundNoteRendering } = deps;

	const markupToHtml = useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml(plugins, {
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
			customCss: customCss || '',
		});
	}, [plugins, customCss]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return useCallback(async (markupLanguage: number, md: string, options: MarkupToHtmlOptions = null): Promise<any> => {
		options = {
			replaceResourceInternalToExternalLinks: false,
			resourceInfos: {},
			platformName: shim.platformName(),
			...options,
		};

		md = md || '';

		const theme = themeStyle(themeId);
		let resources = {};

		if (options.replaceResourceInternalToExternalLinks) {
			md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });
		} else {
			resources = options.resourceInfos;
		}

		delete options.replaceResourceInternalToExternalLinks;

		const result = await markupToHtml.render(markupLanguage, md, theme, {
			codeTheme: theme.codeThemeCss,
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
			codeHighlightCacheKey: 'useMarkupToHtml',
			settingValue: deps.settingValue,
			whiteBackgroundNoteRendering,
			...options,
		});

		return result;
	}, [themeId, markupToHtml, whiteBackgroundNoteRendering, deps.settingValue]);
}
