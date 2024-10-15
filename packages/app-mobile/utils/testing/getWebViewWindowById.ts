import { screen, waitFor } from '@testing-library/react-native';

const getWebViewWindowById = async (id: string): Promise<Window> => {
	const webviewContent = await screen.findByTestId(id);
	expect(webviewContent).toBeVisible();

	await waitFor(() => {
		expect(!!webviewContent.props.window).toBe(true);
	});

	const webviewWindow = webviewContent.props.window;
	return webviewWindow;
};

export default getWebViewWindowById;
