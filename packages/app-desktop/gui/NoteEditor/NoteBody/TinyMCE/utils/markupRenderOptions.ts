import { _ } from '@joplin/lib/locale';
import baseMarkupRendererOptions, { defaultOptions } from '../../../utils/markupRenderOptions';
import { MarkupToHtmlOptions } from '../../../utils/types';
import shim from '@joplin/lib/shim';

const markupRenderOptions = (override?: MarkupToHtmlOptions) => {
	return baseMarkupRendererOptions({
		plugins: {
			...defaultOptions.plugins,
			link_open: {
				...defaultOptions.plugins?.link_open,

				mapLinkTitle: (originalTitle: string, url: string) => {
					// Users can edit the link title in the rich text editor. If the title has been
					// modified (is no longer the default URL, display that instead).
					if (!!originalTitle && originalTitle !== url) {
						return originalTitle;
					}

					if (originalTitle) {
						if (shim.isMac()) {
							return _('Cmd+click to open link: %s', url);
						} else {
							return _('Ctrl+click to open link: %s', url);
						}
					} else {
						if (shim.isMac()) {
							return _('Cmd+click to open link');
						} else {
							return _('Ctrl+click to open link');
						}
					}
				},
			},
		},
		...override,
	});
};

export default markupRenderOptions;
