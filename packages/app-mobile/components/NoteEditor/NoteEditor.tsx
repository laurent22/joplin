import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import MarkdownToolbar from './MarkdownToolbar';

const React = require('react');
const { forwardRef, useImperativeHandle } = require('react');
const { useEffect, useMemo, useState, useCallback, useRef } = require('react');
const { WebView } = require('react-native-webview');
const { View } = require('react-native');
const { editorFont } = require('../global-style');

import { ChangeEvent, UndoRedoDepthChangeEvent } from './EditorType';
import { Selection, SelectionChangeEvent, SelectionFormatting } from './EditorType';
import { EditorControl } from './EditorType';

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionChangeEvent)=> void;

interface Props {
	themeId: number;
	initialText: string;
	initialSelection?: Selection;
	style: any;

	onChange: ChangeEventHandler;
	onSelectionChange: SelectionChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
}

function fontFamilyFromSettings() {
	const f = editorFont(Setting.value('style.editor.fontFamily'));
	return [f, 'sans-serif'].join(', ');
}

function useCss(themeId: number): string {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return `
			:root {
				background-color: ${theme.backgroundColor};
			}
		`;
	}, [themeId]);
}

function useHtml(css: string): string {
	const [html, setHtml] = useState('');

	useEffect(() => {
		setHtml(
			`
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
						<style>
							.cm-editor {
								height: 100%;
							}

							${css}
						</style>
					</head>
					<body style="margin:0; height:100vh; width:100vh; width:100vw; min-width:100vw; box-sizing: border-box; padding: 10px;">
						<div class="CodeMirror" style="height:100%;" autocapitalize="on"></div>
					</body>
				</html>
			`
		);
	}, [css]);

	return html;
}

function editorTheme(themeId: number) {
	return {
		...themeStyle(themeId),
		fontSize: 15,
		fontFamily: fontFamilyFromSettings(),
	};
}

function NoteEditor(props: Props, ref: any) {
	const [source, setSource] = useState(undefined);
	const webviewRef = useRef(null);

	const setInitialSelectionJS = props.initialSelection ? `
		cm.select(${props.initialSelection.start}, ${props.initialSelection.end});
	` : '';

	const injectedJavaScript = `
		if (!window.cm) {
			function postMessage(name, data) {
				window.ReactNativeWebView.postMessage(JSON.stringify({
					data,
					name,
				}));
			}

			function logMessage(...msg) {
				postMessage('onLog', { value: msg });
			}

			window.onerror = (message, source, lineno) => {
				window.ReactNativeWebView.postMessage(
					"error: " + message + " in file://" + source + ", line " + lineno
				);
			};

			// This variable is not used within this script
			// but is called using "injectJavaScript" from
			// the wrapper component.
			window.cm = null;

			try {
				${shim.injectedJs('codeMirrorBundle')};

				const parentElement = document.getElementsByClassName('CodeMirror')[0];
				const theme = ${JSON.stringify(editorTheme(props.themeId))};
				const initialText = ${JSON.stringify(props.initialText)};

				// If parentElement is null, the JavaScript has been injected before the page
				// finished loading. The JavaScript will be re-injected after page load.
				if (parentElement) {
					window.cm = codeMirrorBundle.initCodeMirror(parentElement, initialText, theme);
					${setInitialSelectionJS}

					// When the keyboard is shown/hidden (or the window is resized),
					// make sure we can see the cursor!
					window.onresize = () => {
						cm.scrollSelectionIntoView();
					};
				}
			} catch (e) {
				window.ReactNativeWebView.postMessage("error: " + e.message + ": " + JSON.stringify(e))
			} finally {
				true;
			}
		}
	`;

	const css = useCss(props.themeId);
	const html = useHtml(css);
	const [selectionState, setSelectionState] = useState(new SelectionFormatting());

	// / Runs [js] in the context of the CodeMirror frame.
	const injectJS = (js: string) => {
		webviewRef.current.injectJavaScript(`
			try {
				${js}
			}
			catch(e) {
				logMessage('Error in injected JS:' + e, e);
				throw e;
			};

			true;`);
	};


	const editorControl: EditorControl = {
		undo() {
			injectJS('cm.undo();');
		},
		redo() {
			injectJS('cm.redo();');
		},
		select(anchor: number, head: number) {
			injectJS(
				`cm.select(${JSON.stringify(anchor)}, ${JSON.stringify(head)});`
			);
		},
		insertText(text: string) {
			injectJS(`cm.insertText(${JSON.stringify(text)});`);
		},

		toggleBolded() {
			injectJS('cm.selectionCommands.bold();');
		},
		toggleItalicized() {
			injectJS('cm.selectionCommands.italicize();');
		},
		toggleList(bulleted: boolean) {
			injectJS(`cm.selectionCommands.toggleList(${
				bulleted ? 'true' : 'false'
			});`);
		},
		toggleCode() {
			injectJS('cm.selectionCommands.toggleCode();');
		},
		toggleMath() {
			injectJS('cm.selectionCommands.toggleMath();');
		},
		toggleHeaderLevel(level: number) {
			injectJS(`cm.selectionCommands.toggleHeaderLevel(${level});`);
		},
		increaseIndent() {
			injectJS('cm.selectionCommands.increaseIndent();');
		},
		decreaseIndent() {
			injectJS('cm.selectionCommands.decreaseIndent();');
		},
	};

	useImperativeHandle(ref, () => {
		return editorControl;
	});

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile() {
			const tempFile = `${Setting.value('resourceDir')}/NoteEditor.html`;
			await shim.fsDriver().writeFile(tempFile, html, 'utf8');
			if (cancelled) return;

			setSource({
				uri: `file://${tempFile}?r=${Math.round(Math.random() * 100000000)}`,
				baseUrl: `file://${Setting.value('resourceDir')}/`,
			});
		}

		void createHtmlFile();

		return () => {
			cancelled = true;
		};
	}, [html]);

	const onMessage = useCallback((event: any) => {
		const data = event.nativeEvent.data;

		if (data.indexOf('error:') === 0) {
			console.error('CodeMirror:', data);
			return;
		}

		const msg = JSON.parse(data);

		const handlers: Record<string, Function> = {
			onLog: (event: any) => {
				console.info('CodeMirror:', ...event.value);
			},

			onChange: (event: ChangeEvent) => {
				props.onChange(event);
			},

			onUndoRedoDepthChange: (event: UndoRedoDepthChangeEvent) => {
				console.info('onUndoRedoDepthChange', event);
				props.onUndoRedoDepthChange(event);
			},

			onSelectionChange: (event: SelectionChangeEvent) => {
				props.onSelectionChange(event);
			},

			onSelectionFormattingChange(data: string) {
				// We want a SelectionFormatting object, so are
				// instantiating it from JSON.
				const formatting = SelectionFormatting.fromJSON(data);
				setSelectionState(formatting);
			},
		};

		if (handlers[msg.name]) {
			handlers[msg.name](msg.data);
		} else {
			console.info('Unsupported CodeMirror message:', msg);
		}
	}, [props.onChange]);

	const onError = useCallback(() => {
		console.error('NoteEditor: webview error');
	});


	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0
	return (
		<View style={{
			...props.style,
			flexDirection: 'column',
		}}>
			<View style={{
				flexGrow: 1,
				flexShrink: 0,
				minHeight: '40%',
			}}>
				<WebView
					ref={webviewRef}
					useWebKit={true}
					source={source}
					setSupportMultipleWindows={true}
					allowingReadAccessToURL={`file://${Setting.value('resourceDir')}`}
					originWhitelist={['file://*', './*', 'http://*', 'https://*']}
					allowFileAccess={true}
					injectedJavaScript={injectedJavaScript}
					onMessage={onMessage}
					onError={onError}
				/>
			</View>

			<MarkdownToolbar
				style={{
					overflow: 'hidden',
					flexShrink: 1,
				}}
				themeId={props.themeId}
				editorControl={editorControl}
				selectionState={selectionState}
			/>
		</View>
	);
}

export default forwardRef(NoteEditor);
