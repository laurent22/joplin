export default function(requestMethod: string, modelId: string = null) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const options: any = { userSideValidation: true };
	if (requestMethod === 'POST' && modelId) options.isNew = true;
	return options;
}
