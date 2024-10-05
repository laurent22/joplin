import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import shim from '@joplin/lib/shim';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	bodyEditor: string;
	newWindow: boolean;
	noteId?: string;
	defaultNoteId: string;
	provisionalNoteIds: string[];
}

const NoteEditorWrapper: React.FC<Props> = props => {
	const [iframeRef, setIframeRef] = useState<HTMLIFrameElement|null>(null);
	const [loaded, setLoaded] = useState(false);
	const [doc, setDoc] = useState<Document>(null);

	useEffect(() => {
		let openedWindow: Window|null = null;
		const unmounted = false;
		if (iframeRef) {
			setDoc(iframeRef?.contentWindow?.document);
		} else if (props.newWindow) {
			openedWindow = window.open('about:blank');
			setDoc(openedWindow.document);

			void (async () => {
				while (!unmounted) {
					await new Promise<void>(resolve => {
						shim.setTimeout(() => resolve(), 2000);
					});

					// .onbeforeunload and .onclose events don't seem to fire when closed by a user -- rely on polling
					// instead:
					if (openedWindow?.closed) {
						props.dispatch({ type: 'NOTE_WINDOW_CLOSE', noteId: props.noteId });
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
				}
			}, 200);
		};
	}, [iframeRef, props.newWindow, props.noteId, props.dispatch]);

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

	const noteId = props.noteId ?? props.defaultNoteId;
	const content = <>
		<NoteEditor bodyEditor={props.bodyEditor} noteId={noteId} isProvisional={props.provisionalNoteIds.includes(noteId)}/>
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
	let bodyEditor = state.settings['editor.codeView'] ? 'CodeMirror6' : 'TinyMCE';

	if (state.settings.isSafeMode) {
		bodyEditor = 'PlainText';
	} else if (state.settings['editor.codeView'] && state.settings['editor.legacyMarkdown']) {
		bodyEditor = 'CodeMirror5';
	}

	const defaultNoteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;

	return {
		themeId: state.settings.theme,
		provisionalNoteIds: state.provisionalNoteIds,
		defaultNoteId: defaultNoteId,
		bodyEditor,
	};
})(NoteEditorWrapper);
