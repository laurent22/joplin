import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useCallback, useMemo } from 'react';
import markupLanguageUtils from '@joplin/lib/utils/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';

const { themeStyle } = require('@joplin/lib/theme');
import Note from '@joplin/lib/models/Note';
import { ResourceInfos } from '../NoteEditor/utils/types';
import { resourceFullPath } from '@joplin/lib/models/utils/resourceUtils';
import { RenderOptions } from '@joplin/renderer/types';
import getPluginSettingValue from '@joplin/lib/services/plugins/utils/getPluginSettingValue';
import { ScrollbarSize } from '@joplin/lib/models/settings/builtInMetadata';

export interface MarkupToHtmlOptions extends RenderOptions {
	resourceInfos?: ResourceInfos;
	replaceResourceInternalToExternalLinks?: boolean;
}

interface HookDependencies {
	themeId: number;
	customCss: string;
	plugins: PluginStates;
	whiteBackgroundNoteRendering: boolean;
	scrollbarSize: ScrollbarSize;
}

export default function useMarkupToHtml(deps: HookDependencies) {
	const { themeId, customCss, plugins, whiteBackgroundNoteRendering, scrollbarSize } = deps;

	const resourceBaseUrl = useMemo(() => {
		return `joplin-content://note-viewer/${Setting.value('resourceDir')}/`;
	}, []);

	const markupToHtml = useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml(plugins, {
			resourceBaseUrl,
			customCss: customCss || '',
		});
	}, [plugins, customCss, resourceBaseUrl]);

	return useCallback(async (markupLanguage: number, md: string, options: MarkupToHtmlOptions|null = null) => {
		options = {
			replaceResourceInternalToExternalLinks: false,
			resourceInfos: {},
			platformName: shim.platformName(),
			...options,
		};

		md = md || '';

		const theme = themeStyle(themeId);
		let resources: ResourceInfos = {};

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
			settingValue: getPluginSettingValue,
			whiteBackgroundNoteRendering,
			scrollbarSize: scrollbarSize,
			itemIdToUrl: (id: string, urlParameters = '') => {
				if (!(id in resources) || !resources[id]) {
					return null;
				}

				return resourceFullPath(resources[id].item, resourceBaseUrl) + urlParameters;
			},
			...options,
		});

		return result;
	}, [themeId, markupToHtml, whiteBackgroundNoteRendering, scrollbarSize, resourceBaseUrl]);
}
