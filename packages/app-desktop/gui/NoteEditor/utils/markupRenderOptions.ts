import { MarkupToHtmlOptions } from './types';

export const defaultOptions: MarkupToHtmlOptions = {
	plugins: {
		checkbox: {
			checkboxRenderingType: 2,
		},
		link_open: {
			linkRenderingType: 2,
		},
	},
	replaceResourceInternalToExternalLinks: true,
};

export default (override: MarkupToHtmlOptions = null): MarkupToHtmlOptions => {
	return {
		...defaultOptions,
		...override,
	};
};
