export interface DefaultSaveOptions {
	userSideValidation: boolean;
	isNew?: boolean;
	autoTimestamp?: boolean;
}

export default function(requestMethod: string, modelId: string = null): DefaultSaveOptions {
	const options: DefaultSaveOptions = { userSideValidation: true };
	if (requestMethod === 'POST' && modelId) options.isNew = true;
	return options;
}
