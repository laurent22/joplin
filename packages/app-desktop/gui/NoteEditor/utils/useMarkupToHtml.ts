import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useCallback, useMemo } from 'react';
import { ResourceInfos } from './types';
import markupLanguageUtils from '../../../utils/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';

const { themeStyle } = require('@joplin/lib/theme');
import Note from '@joplin/lib/models/Note';

interface HookDependencies {
	themeId: number;
	customCss: string;
	plugins: PluginStates;
}

export interface MarkupToHtmlOptions {
	replaceResourceInternalToExternalLinks?: boolean;
	resourceInfos?: ResourceInfos;
	contentMaxWidth?: number;
	plugins?: Record<string, any>;
	bodyOnly?: boolean;
	mapsToLine?: boolean;
	useCustomPdfViewer?: boolean;
	noteId?: string;
	vendorDir?: string;
	platformName?: string;
}

export default function useMarkupToHtml(deps: HookDependencies) {
	const { themeId, customCss, plugins } = deps;

	const markupToHtml = useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml(deps.plugins, {
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
			customCss: customCss || '',
		});
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [plugins, customCss]);

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

		const result = await markupToHtml.render(markupLanguage, md, theme, { codeTheme: theme.codeThemeCss,
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
			codeHighlightCacheKey: 'useMarkupToHtml', ...options });

		return result;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [themeId, customCss, markupToHtml]);
}
