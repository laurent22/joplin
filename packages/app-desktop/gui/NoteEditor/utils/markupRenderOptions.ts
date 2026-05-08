import { LinkRenderingType } from '@joplin/renderer/MdToHtml';
import { MarkupToHtmlOptions } from './types';
import { getGlobalSettings, ResourceInfos } from '@joplin/renderer/types';
import Setting from '@joplin/lib/models/Setting';

interface OptionOverride {
	bodyOnly: boolean;
	resourceInfos?: ResourceInfos;
	allowedFilePrefixes?: string[];
}

export default (override: OptionOverride = null): MarkupToHtmlOptions => {
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
		globalSettings: getGlobalSettings(Setting),
		...override,
	};
};
