import { RefObject, useEffect, useRef } from 'react';

type OnMessage = (event: MessageEvent)=> void;

const useMessageHandler = (viewRef: RefObject<HTMLIFrameElement>, onMessage: OnMessage) => {
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	useEffect(() => {
		function onMessage_(event: MessageEvent) {
			if (event.source !== viewRef.current.contentWindow) {
				return;
			}

			onMessageRef.current(event);
		}

		const containerWindow = (viewRef.current.getRootNode() as Document).defaultView;
		containerWindow.addEventListener('message', onMessage_);

		return () => {
			containerWindow.removeEventListener('message', onMessage_);
		};
	}, [viewRef]);
};

export default useMessageHandler;
