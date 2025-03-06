'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
const markupLanguageUtils_1 = require('@joplin/lib/utils/markupLanguageUtils');
const Setting_1 = require('@joplin/lib/models/Setting');
const shim_1 = require('@joplin/lib/shim');
const { themeStyle } = require('@joplin/lib/theme');
const Note_1 = require('@joplin/lib/models/Note');
const resourceUtils_1 = require('@joplin/lib/models/utils/resourceUtils');
function useMarkupToHtml(deps) {
	const { themeId, customCss, plugins, whiteBackgroundNoteRendering } = deps;
	const resourceBaseUrl = (0, react_1.useMemo)(() => {
		return `joplin-content://note-viewer/${Setting_1.default.value('resourceDir')}/`;
	}, []);
	const markupToHtml = (0, react_1.useMemo)(() => {
		return markupLanguageUtils_1.default.newMarkupToHtml(plugins, {
			resourceBaseUrl,
			customCss: customCss || '',
		});
	}, [plugins, customCss, resourceBaseUrl]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (0, react_1.useCallback)(async (markupLanguage, md, options = null) => {
		options = { replaceResourceInternalToExternalLinks: false, resourceInfos: {}, platformName: shim_1.default.platformName(), ...options };
		md = md || '';
		const theme = themeStyle(themeId);
		let resources = {};
		if (options.replaceResourceInternalToExternalLinks) {
			md = await Note_1.default.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });
		} else {
			resources = options.resourceInfos;
		}
		delete options.replaceResourceInternalToExternalLinks;
		const result = await markupToHtml.render(markupLanguage, md, theme, { codeTheme: theme.codeThemeCss, resources: resources, postMessageSyntax: 'ipcProxySendToHost', splitted: true, externalAssetsOnly: true, codeHighlightCacheKey: 'useMarkupToHtml', settingValue: deps.settingValue, whiteBackgroundNoteRendering, itemIdToUrl: (id, urlParameters = '') => {
			if (!(id in resources) || !resources[id]) {
				return null;
			}
			return (0, resourceUtils_1.resourceFullPath)(resources[id].item, resourceBaseUrl) + urlParameters;
		}, ...options });
		return result;
	}, [themeId, markupToHtml, whiteBackgroundNoteRendering, resourceBaseUrl, deps.settingValue]);
}
exports.default = useMarkupToHtml;
// # sourceMappingURL=useMarkupToHtml.js.map
