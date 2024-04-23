import { _ } from '@joplin/lib/locale';
import baseMarkupRendererOptions from '../../../utils/markupRenderOptions';
import { MarkupToHtmlOptions } from '../../../utils/types';
import shim from '@joplin/lib/shim';

const markupRenderOptions = (override?: MarkupToHtmlOptions) => {
	return baseMarkupRendererOptions({
		plugins: {
			link_open: {
				mapLinkTitle: (originalTitle: string, url: string) => {
					if (originalTitle && originalTitle !== url) {
						return originalTitle;
					}

					if (shim.isMac()) {
						return _('Cmd+click to open hyperlink: %s', url);
					} else {
						return _('Ctrl+click to open hyperlink: %s', url);
					}
				},
			},
		},
		...override,
	});
};

export default markupRenderOptions;
