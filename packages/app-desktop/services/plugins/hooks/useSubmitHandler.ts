import { RefObject } from 'react';
import useMessageHandler from './useMessageHandler';

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
export default function(viewRef: RefObject<HTMLIFrameElement>, onSubmit: Function, onDismiss: Function) {
	useMessageHandler(viewRef, event => {
		const message = event.data?.message;
		if (message === 'form-submit') {
			onSubmit();
		} else if (message === 'dismiss') {
			onDismiss();
		}
	});
}
