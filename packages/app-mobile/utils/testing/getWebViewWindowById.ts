import { screen, waitFor } from './testingLibrary';

const getWebViewWindowById = async (id: string): Promise<Window & typeof globalThis> => {
	const webviewContent = await screen.findByTestId(id);
	expect(webviewContent).toBeVisible();

	await waitFor(() => {
		expect(!!webviewContent.props.window).toBe(true);
	});

	const webviewWindow = webviewContent.props.window;
	return webviewWindow;
};

export default getWebViewWindowById;
