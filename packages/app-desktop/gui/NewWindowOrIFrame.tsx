import shim from '@joplin/lib/shim';
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
	// Note: children will be rendered in a different DOM from this node. Avoid using document.* methods
	// in child components.
	children: React.ReactNode[]|React.ReactNode;
	newWindow: boolean;
	onClose: ()=> void;
}

const NewWindowOrIFrame: React.FC<Props> = props => {
	const [iframeRef, setIframeRef] = useState<HTMLIFrameElement|null>(null);
	const [loaded, setLoaded] = useState(false);
	const [doc, setDoc] = useState<Document>(null);

	const onCloseRef = useRef(props.onClose);
	onCloseRef.current = props.onClose;

	useEffect(() => {
		let openedWindow: Window|null = null;
		const unmounted = false;
		if (iframeRef) {
			setDoc(iframeRef?.contentWindow?.document);
		} else if (props.newWindow) {
			openedWindow = window.open('about:blank');
			setDoc(openedWindow.document);

			// .onbeforeunload and .onclose events don't seem to fire when closed by a user -- rely on polling
			// instead:
			void (async () => {
				while (!unmounted) {
					await new Promise<void>(resolve => {
						shim.setTimeout(() => resolve(), 2000);
					});

					if (openedWindow?.closed) {
						onCloseRef.current?.();
						openedWindow = null;
						break;
					}
				}
			})();
		}

		return () => {
			// Delay: Closing immediately causes Electron to crash
			setTimeout(() => {
				if (!openedWindow?.closed) {
					openedWindow?.close();
					onCloseRef.current?.();
					openedWindow = null;
				}
			}, 200);

			if (iframeRef && !openedWindow) {
				onCloseRef.current?.();
			}
		};
	}, [iframeRef, props.newWindow]);

	useEffect(() => {
		if (!doc) return;

		doc.open();
		doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
		doc.close();

		const cssUrls = [
			'style.min.css',
			'style/icons/style.css',
			'vendor/lib/@fortawesome/fontawesome-free/css/all.min.css',
			'vendor/lib/react-datetime/css/react-datetime.css',
			'vendor/lib/smalltalk/css/smalltalk.css',
			'vendor/lib/roboto-fontface/css/roboto/roboto-fontface.css',
			'vendor/lib/codemirror/lib/codemirror.css',
		];

		for (const url of cssUrls) {
			const style = doc.createElement('link');
			style.rel = 'stylesheet';
			style.href = url;
			doc.head.appendChild(style);
		}

		doc.body.style.height = '100vh';

		setLoaded(true);
	}, [doc]);
	const parentNode = loaded ? doc?.body : null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed to allow adding the portal to the DOM
	const contentPortal = parentNode && createPortal(props.children, parentNode) as any;
	if (props.newWindow) {
		return <div style={{ display: 'none' }}>{contentPortal}</div>;
	} else {
		return <iframe
			ref={setIframeRef}
			style={{ flexGrow: 1, width: '100%', height: '100%', border: 'none' }}
		>
			{contentPortal}
		</iframe>;
	}
};

export default NewWindowOrIFrame;
