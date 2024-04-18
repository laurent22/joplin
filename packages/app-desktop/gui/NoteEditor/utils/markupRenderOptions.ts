import { MarkupToHtmlOptions } from './types';

export default (override: MarkupToHtmlOptions = null): MarkupToHtmlOptions => {
	return {
		plugins: {
			checkbox: {
				checkboxRenderingType: 2,
			},
			link_open: {
				linkRenderingType: 2,
			},
		},
		replaceResourceInternalToExternalLinks: true,
		...override,
	};
};
