import { OnMessageEvent } from '../components/ExtendedWebView/types';

interface WebViewEventHandlers {
	onLoadEnd: ()=> void;
	onMessage: (event: OnMessageEvent)=> void;
}

export interface PageSetupSources {
	css: string;
	js: string;
}

export interface SetUpResult<Api> {
	api: Api;
	pageSetup: PageSetupSources;
	webViewEventHandlers: WebViewEventHandlers;
}
