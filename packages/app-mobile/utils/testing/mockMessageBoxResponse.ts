import shim from '@joplin/lib/shim';

const mockMessageBoxResponse = (response: string) => {
	shim.showMessageBox = jest.fn(async (_message, options) => {
		return (options.buttons ?? []).indexOf(response);
	});
	return shim.showMessageBox;
};

export default mockMessageBoxResponse;
