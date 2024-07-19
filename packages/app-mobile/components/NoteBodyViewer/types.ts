import { OnMessageEvent } from '../ExtendedWebView/types';

export type OnScrollCallback = (scrollTop: number)=> void;
export type OnWebViewMessageHandler = (event: OnMessageEvent)=> void;
