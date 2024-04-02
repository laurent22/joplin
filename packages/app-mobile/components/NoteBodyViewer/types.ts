import { WebViewMessageEvent } from 'react-native-webview';

export type OnScrollCallback = (scrollTop: number)=> void;
export type OnWebViewMessageHandler = (event: WebViewMessageEvent)=> void;
