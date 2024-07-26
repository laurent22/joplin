import { screen, waitFor } from '@testing-library/react-native';
const getWebViewDomById = async (id: string): Promise<Document> => {
	const webviewContent = await screen.findByTestId(id);
	expect(webviewContent).toBeVisible();

	await waitFor(() => {
		expect(!!webviewContent.props.document).toBe(true);
	});

	// Return the composite ExtendedWebView component
	// See https://callstack.github.io/react-native-testing-library/docs/advanced/testing-env#tree-navigation
	return webviewContent.props.document;
};

export default getWebViewDomById;
