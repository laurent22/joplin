import { OnMessageEvent } from '../ExtendedWebView/types';

export { OnScrollCallback } from '../../contentScripts/rendererBundle/types';
export type OnWebViewMessageHandler = (event: OnMessageEvent)=> void;
