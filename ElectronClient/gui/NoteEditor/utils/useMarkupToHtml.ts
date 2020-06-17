import { useCallback } from 'react';
import { ResourceInfos } from './types';
const { themeStyle } = require('lib/theme');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const markupLanguageUtils = require('lib/markupLanguageUtils');

interface HookDependencies {
	themeId: number,
	customCss: string,
}

interface MarkupToHtmlOptions {
	replaceResourceInternalToExternalLinks?: boolean,
	resourceInfos?: ResourceInfos,
}

export default function useMarkupToHtml(dependencies:HookDependencies) {
	const { themeId, customCss } = dependencies;

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

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		const result = await markupToHtml.render(markupLanguage, md, theme, Object.assign({}, {
			codeTheme: theme.codeThemeCss,
			userCss: customCss || '',
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
		}, options));

		return result;
	}, [themeId, customCss]);
}
