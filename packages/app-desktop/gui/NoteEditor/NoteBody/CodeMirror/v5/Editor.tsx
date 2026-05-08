import * as React from 'react';
import { useEffect, useImperativeHandle, useState, useRef, useCallback, forwardRef, RefObject } from 'react';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';

import CodeMirror from 'codemirror';

import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/searchcursor';

import useListIdent from './utils/useListIdent';
import useScrollUtils from './utils/useScrollUtils';
import useCursorUtils from './utils/useCursorUtils';
import useLineSorting from './utils/useLineSorting';
import { OnSetMarkers } from '../utils/useEditorSearchExtension';
import useJoplinMode from './utils/useJoplinMode';
import useKeymap from './utils/useKeymap';
import useExternalPlugins from './utils/useExternalPlugins';
import useJoplinCommands from './utils/useJoplinCommands';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';
import 'codemirror/keymap/sublime'; // Used for swapLineUp and swapLineDown

import 'codemirror/mode/meta';

import Setting from '@joplin/lib/models/Setting';

// import eventManager from '@joplin/lib/eventManager';

import { focus } from '@joplin/lib/utils/focusHandler';

// Based on http://pypl.github.io/PYPL.html
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/php/php';
import 'codemirror/mode/r/r';
import 'codemirror/mode/swift/swift';
import 'codemirror/mode/go/go';
import 'codemirror/mode/vb/vb';
import 'codemirror/mode/vbscript/vbscript';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/dart/dart';
import 'codemirror/mode/lua/lua';
import 'codemirror/mode/groovy/groovy';
import 'codemirror/mode/perl/perl';
import 'codemirror/mode/cobol/cobol';
import 'codemirror/mode/julia/julia';
import 'codemirror/mode/haskell/haskell';
import 'codemirror/mode/pascal/pascal';
import 'codemirror/mode/css/css';

// Additional languages, not in the PYPL lis;
import 'codemirror/mode/xml/xml'; // For HTML too
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/dockerfile/dockerfile';
import 'codemirror/mode/diff/diff';
import 'codemirror/mode/erlang/erlang';
import 'codemirror/mode/sql/sql';

interface ExtendedWindow {
	CodeMirror?: unknown;
}
declare const window: ExtendedWindow;


export interface EditorProps {
	value: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	searchMarkers: any;
	onSetMarkersRef: RefObject<OnSetMarkers>;
	mode: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	codeMirrorTheme: any;
	readOnly: boolean;
	autoMatchBraces: boolean | object;
	keyMap: string;
	plugins: PluginStates;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onChange: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onScroll: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onEditorPaste: any;
	isSafeMode: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onResize: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onUpdate: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function Editor(props: EditorProps, ref: any) {
	const [editor, setEditor] = useState(null);
	const editorParent = useRef(null);
	const lastEditTime = useRef(NaN);

	useEffect(() => {
		window.CodeMirror = CodeMirror;

		return () => {
			window.CodeMirror = undefined;
		};
	}, []);

	// Codemirror plugins add new commands to codemirror (or change it's behavior)
	// This command adds the smartListIndent function which will be bound to tab
	useListIdent(CodeMirror);
	useScrollUtils(CodeMirror);
	useCursorUtils(CodeMirror);
	useLineSorting(CodeMirror);
	useJoplinMode(CodeMirror);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const pluginOptions: any = useExternalPlugins(CodeMirror, props.plugins);
	useKeymap(CodeMirror);
	useJoplinCommands(CodeMirror);

	useImperativeHandle(ref, () => {
		return editor;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_change = useCallback((cm: any, change: any) => {
		if (props.onChange && change.origin !== 'setValue') {
			props.onChange(cm.getValue());
			lastEditTime.current = Date.now();
		}
	}, [props.onChange]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_scroll = useCallback((_cm: any) => {
		props.onScroll();
	}, [props.onScroll]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_paste = useCallback((_cm: any, _event: any) => {
		props.onEditorPaste();
	}, [props.onEditorPaste]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_drop = useCallback((cm: any, _event: any) => {
		focus('v5/Editor::editor_drop', cm);
	}, []);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_drag = useCallback((cm: any, event: any) => {
		// This is the type for all drag and drops that are external to codemirror
		// setting the cursor allows us to drop them in the right place
		if (event.dataTransfer.effectAllowed === 'all') {
			const coords = cm.coordsChar({ left: event.x, top: event.y });
			cm.setCursor(coords);
		}

		event.dataTransfer.dropEffect = 'copy';
	}, []);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_resize = useCallback((cm: any) => {
		props.onResize(cm);
	}, [props.onResize]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const editor_update = useCallback((cm: any) => {
		const edited = Date.now() - lastEditTime.current <= 100;
		props.onUpdate(cm, edited);
	}, [props.onUpdate]);

	useEffect(() => {
		if (!editorParent.current) return () => {};

		const userOptions = {};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const safeOptions: Record<string, any> = {
			value: props.value,
			readOnly: props.readOnly,
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const unsafeOptions: Record<string, any> = {
			screenReaderLabel: props.value,
			theme: props.codeMirrorTheme,
			mode: props.mode,
			readOnly: props.readOnly,
			autoCloseBrackets: props.autoMatchBraces,
			inputStyle: Setting.value('editor.spellcheckBeta') ? 'contenteditable' : 'textarea',
			lineWrapping: true,
			lineNumbers: false,
			indentWithTabs: true,
			indentUnit: 4,
			spellcheck: true,
			allowDropFileTypes: [''], // disable codemirror drop handling
			keyMap: props.keyMap ? props.keyMap : 'default',
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let cmOptions: Record<string, any> = { ...safeOptions };

		if (!props.isSafeMode) {
			cmOptions = {
				...cmOptions,
				...unsafeOptions,
				...userOptions,
			};
		}

		const cm = CodeMirror(editorParent.current, cmOptions);
		setEditor(cm);
		cm.on('change', editor_change);
		cm.on('scroll', editor_scroll);
		cm.on('paste', editor_paste);
		cm.on('drop', editor_drop);
		cm.on('dragover', editor_drag);
		cm.on('refresh', editor_resize);
		cm.on('update', editor_update);

		// It's possible for searchMarkers to be available before the editor
		// In these cases we set the markers asap so the user can see them as
		// soon as the editor is ready
		if (props.searchMarkers) { props.onSetMarkersRef.current(cm, props.searchMarkers.keywords, props.searchMarkers.options); }

		return () => {
			// Clean up codemirror
			cm.off('change', editor_change);
			cm.off('scroll', editor_scroll);
			cm.off('paste', editor_paste);
			cm.off('drop', editor_drop);
			cm.off('dragover', editor_drag);
			cm.off('refresh', editor_resize);
			cm.off('update', editor_update);
			// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
			if (editorParent.current) editorParent.current.removeChild(cm.getWrapperElement());
			setEditor(null);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	useEffect(() => {
		if (editor) {
			//  Value can also be changed by the editor itself so we need this guard
			//  to prevent loops
			if (props.value !== editor.getValue()) {
				editor.setValue(props.value);
				editor.clearHistory();
			}
			editor.setOption('screenReaderLabel', props.value);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.value]);

	useEffect(() => {
		if (editor) {
			editor.setOption('theme', props.codeMirrorTheme);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.codeMirrorTheme]);

	useEffect(() => {
		if (editor) {
			editor.setOption('mode', props.mode);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.mode]);

	useEffect(() => {
		if (editor) {
			editor.setOption('readOnly', props.readOnly);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.readOnly]);

	useEffect(() => {
		if (editor) {
			editor.setOption('autoCloseBrackets', props.autoMatchBraces);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.autoMatchBraces]);

	useEffect(() => {
		if (editor) {
			editor.setOption('keyMap', props.keyMap ? props.keyMap : 'default');
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.keyMap]);

	useEffect(() => {
		if (editor) {
			for (const option in pluginOptions) {
				editor.setOption(option, pluginOptions[option]);
			}
		}
	}, [pluginOptions, editor]);

	return <div className='codeMirrorEditor CodeMirror5' style={props.style} ref={editorParent} />;
}

export default forwardRef(Editor);
