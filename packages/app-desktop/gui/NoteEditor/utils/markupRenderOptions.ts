import { LinkRenderingType } from '@joplin/renderer/MdToHtml';
import { MarkupToHtmlOptions } from './types';

export default (override: MarkupToHtmlOptions = null): MarkupToHtmlOptions => {
	return {
		plugins: {
			checkbox: {
				checkboxRenderingType: 2,
			},
			link_open: {
				linkRenderingType: LinkRenderingType.HrefHandler,
			},
		},
		replaceResourceInternalToExternalLinks: true,
		...override,
	};
};
