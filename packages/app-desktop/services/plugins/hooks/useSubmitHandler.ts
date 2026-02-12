import { RefObject } from 'react';
import useMessageHandler from './useMessageHandler';

type OnEvent = ()=> void;

export default function(viewRef: RefObject<HTMLIFrameElement>, onSubmit: OnEvent, onDismiss: OnEvent) {
	useMessageHandler(viewRef, event => {
		const message = event.data?.message;
		if (message === 'form-submit' && onSubmit) {
			onSubmit();
		} else if (message === 'dismiss' && onDismiss) {
			onDismiss();
		}
	});
}
