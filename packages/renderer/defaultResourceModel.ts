import { OptionsResourceModel } from './types';

// Used for tests and when no ResourceModel is provided.

const defaultResourceModel: OptionsResourceModel = {
	isResourceUrl: (_url: string) => false,
	urlToId: _url => {
		throw new Error('Not implemented: urlToId');
	},
	isSupportedImageMimeType: _type => false,
};

export default defaultResourceModel;
