import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';

interface Props {
	themeId: number;
	bodyEditor: string;
	newWindow: boolean;
}

const NoteEditorWrapper: React.FC<Props> = props => {
	const [iframeRef, setIframeRef] = useState<HTMLIFrameElement|null>(null);
	const [loaded, setLoaded] = useState(false);
	const [doc, setDoc] = useState<Document>(null);

	useEffect(() => {
		let openedWindow: Window|null = null;
		if (iframeRef) {
			setDoc(iframeRef?.contentWindow?.document);
		} else if (props.newWindow) {
			openedWindow = window.open('about:blank');
			setDoc(openedWindow.document);
		}

		return () => {
			// Delay: Closing immediately causes Electron to crash
			setTimeout(() => openedWindow?.close(), 200);
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

	const content = <>
		<NoteEditor bodyEditor={props.bodyEditor}/>
		<StyleSheetContainer themeId={props.themeId}/>
	</>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed to allow adding the portal to the DOM
	const contentPortal = parentNode && createPortal(content, parentNode) as any;
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

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(NoteEditorWrapper);
