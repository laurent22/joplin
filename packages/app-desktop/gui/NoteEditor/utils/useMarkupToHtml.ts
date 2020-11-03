import { PluginStates } from '@joplinapp/lib/services/plugins/reducer';
import contentScriptsToRendererRules from '@joplinapp/lib/services/plugins/utils/contentScriptsToRendererRules';
import { useCallback, useMemo } from 'react';
import { ResourceInfos } from './types';
import markupLanguageUtils from '@joplinapp/lib/markupLanguageUtils';
import Setting from '@joplinapp/lib/models/Setting';

const { themeStyle } = require('@joplinapp/lib/theme');
const Note = require('@joplinapp/lib/models/Note');

interface HookDependencies {
	themeId: number,
	customCss: string,
	plugins: PluginStates,
}

interface MarkupToHtmlOptions {
	replaceResourceInternalToExternalLinks?: boolean,
	resourceInfos?: ResourceInfos,
}

export default function useMarkupToHtml(deps:HookDependencies) {
	const { themeId, customCss, plugins } = deps;

	const markupToHtml = useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
			extraRendererRules: contentScriptsToRendererRules(plugins),
		});
	}, [plugins]);

	return useCallback(async (markupLanguage: number, md: string, options: MarkupToHtmlOptions = null): Promise<any> => {
		options = {
			replaceResourceInternalToExternalLinks: false,
			resourceInfos: {},
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

		const result = await markupToHtml.render(markupLanguage, md, theme, Object.assign({}, {
			codeTheme: theme.codeThemeCss,
			userCss: customCss || '',
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
		}, options));

		return result;
	}, [themeId, customCss, markupToHtml]);
}
