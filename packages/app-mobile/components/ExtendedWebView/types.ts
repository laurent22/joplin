import { StyleProp, ViewStyle } from 'react-native';
import { WebViewErrorEvent } from 'react-native-webview/lib/WebViewTypes';

export interface WebViewControl {
	// Evaluate the given [script] in the context of the page.
	// Unlike react-native-webview/WebView, this does not need to return true.
	injectJS(script: string): void;

	// message must be convertible to JSON
	postMessage(message: unknown): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needs to interface with old code from before rule was applied.
export type OnMessageEvent = { nativeEvent: { data: any } };

export type OnMessageCallback = (event: OnMessageEvent)=> void;
export type OnErrorCallback = (event: WebViewErrorEvent)=> void;
export type OnLoadCallback = ()=> void;

export interface Props {
	// A name to be associated with the WebView (e.g. NoteEditor)
	// This name should be unique.
	webviewInstanceId: string;
	testID?: string;
	hasPluginScripts?: boolean;

	// Forwarded to RN WebView
	scrollEnabled?: boolean;
	allowFileAccessFromJs?: boolean;
	mixedContentMode?: 'never'|'always';

	// If HTML is still being loaded, [html] should be an empty string.
	html: string;

	// Initial javascript. Must evaluate to true.
	injectedJavaScript: string;

	style?: StyleProp<ViewStyle>;
	onMessage: OnMessageCallback;
	onError?: OnErrorCallback;
	onLoadStart?: OnLoadCallback;
	onLoadEnd?: OnLoadCallback;

	// Defaults to the resource directory
	baseDirectory?: string;
}
