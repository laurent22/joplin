import { defaultWindowId } from '@joplin/lib/reducer';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { useState, useEffect, useRef, createContext } from 'react';
import { createPortal } from 'react-dom';
import { SecondaryWindowApi } from '../utils/window/types';

// This component uses react-dom's Portals to render its children in a different HTML
// document. As children are rendered in a different Window/Document, they should avoid
// referencing the `window` and `document` globals. Instead, HTMLElement.ownerDocument
// and refs can be used to access the child component's DOM.

export const WindowIdContext = createContext(defaultWindowId);

type OnCloseCallback = ()=> void;
type OnFocusCallback = ()=> void;

export enum WindowMode {
	Iframe, NewWindow,
}

interface Props {
	// Note: children will be rendered in a different DOM from this node. Avoid using document.* methods
	// in child components.
	children: React.ReactNode[]|React.ReactNode;
	title: string;
	mode: WindowMode;
	windowId: string;
	onClose: OnCloseCallback;
	onFocus?: OnFocusCallback;
}

const useDocument = (
	mode: WindowMode,
	iframeElement: HTMLIFrameElement|null,
	onClose: OnCloseCallback,
) => {
	const [doc, setDoc] = useState<Document>(null);

	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		let openedWindow: Window|null = null;
		const unmounted = false;
		if (iframeElement) {
			setDoc(iframeElement?.contentWindow?.document);
		} else if (mode === WindowMode.NewWindow) {
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

			if (iframeElement && !openedWindow) {
				onCloseRef.current?.();
			}
		};
	}, [iframeElement, mode]);

	return doc;
};

type OnSetLoaded = (loaded: boolean)=> void;
const useDocumentSetup = (doc: Document|null, setLoaded: OnSetLoaded, onFocus?: OnFocusCallback) => {
	const onFocusRef = useRef(onFocus);
	onFocusRef.current = onFocus;

	useEffect(() => {
		if (!doc) return;

		doc.open();
		doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
		doc.close();

		const cssUrls = [
			'style.min.css',
		];

		for (const url of cssUrls) {
			const style = doc.createElement('link');
			style.rel = 'stylesheet';
			style.href = url;
			doc.head.appendChild(style);
		}

		const jsUrls = [
			'vendor/lib/smalltalk/dist/smalltalk.min.js',
			'./utils/window/eventHandlerOverrides.js',
		];
		for (const url of jsUrls) {
			const script = doc.createElement('script');
			script.src = url;
			doc.head.appendChild(script);
		}

		doc.body.style.height = '100vh';

		const containerWindow = doc.defaultView;
		containerWindow.addEventListener('focus', () => {
			onFocusRef.current?.();
		});
		if (doc.hasFocus()) {
			onFocusRef.current?.();
		}

		setLoaded(true);
	}, [doc, setLoaded]);
};

const NewWindowOrIFrame: React.FC<Props> = props => {
	const [iframeRef, setIframeRef] = useState<HTMLIFrameElement|null>(null);
	const [loaded, setLoaded] = useState(false);

	const doc = useDocument(props.mode, iframeRef, props.onClose);
	useDocumentSetup(doc, setLoaded, props.onFocus);

	useEffect(() => {
		if (!doc) return;
		doc.title = props.title;
	}, [doc, props.title]);

	useEffect(() => {
		const win = doc?.defaultView;
		if (win && 'electronWindow' in win && typeof win.electronWindow === 'object') {
			const electronWindow = win.electronWindow as SecondaryWindowApi;
			electronWindow.onSetWindowId(props.windowId);
		}
	}, [doc, props.windowId]);

	const parentNode = loaded ? doc?.body : null;
	const wrappedChildren = <WindowIdContext.Provider value={props.windowId}>{props.children}</WindowIdContext.Provider>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed to allow adding the portal to the DOM
	const contentPortal = parentNode && createPortal(wrappedChildren, parentNode) as any;
	if (props.mode === WindowMode.NewWindow) {
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
