import * as React from 'react';
import { ForwardedRef } from 'react';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorProps, LogMessageCallback, OnEventCallback, ContentScriptData } from '@joplin/editor/types';
import createEditor from '@joplin/editor/CodeMirror/createEditor';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import setupVim from '@joplin/editor/CodeMirror/utils/setupVim';
import { dirname } from 'path';
import useKeymap from './utils/useKeymap';
import useEditorSearch from '../utils/useEditorSearchExtension';
import CommandService from '@joplin/lib/services/CommandService';
import { SearchMarkers } from '../../../utils/useSearchMarkers';
import localisation from './utils/localisation';

interface Props extends EditorProps {
	style: React.CSSProperties;
	pluginStates: PluginStates;

	onEditorPaste: (event: Event)=> void;
	externalSearch: SearchMarkers;
	useLocalSearch: boolean;
}

const Editor = (props: Props, ref: ForwardedRef<CodeMirrorControl>) => {
	const editorContainerRef = useRef<HTMLDivElement>();
	const [editor, setEditor] = useState<CodeMirrorControl|null>(null);

	// The editor will only be created once, so callbacks that could
	// change need to be stored as references.
	const onEventRef = useRef<OnEventCallback>(props.onEvent);
	const onLogMessageRef = useRef<LogMessageCallback>(props.onLogMessage);

	useEffect(() => {
		onEventRef.current = props.onEvent;
		onLogMessageRef.current = props.onLogMessage;
	}, [props.onEvent, props.onLogMessage]);

	useEditorSearch(editor);

	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const pasteEventHandler = (_editor: any, event: Event) => {
			props.onEditorPaste(event);
		};

		editor.on('paste', pasteEventHandler);

		return () => {
			editor.off('paste', pasteEventHandler);
		};
	}, [editor, props.onEditorPaste]);

	useImperativeHandle(ref, () => {
		return editor;
	}, [editor]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const contentScripts: ContentScriptData[] = [];
		for (const pluginId in props.pluginStates) {
			const pluginState = props.pluginStates[pluginId];
			const codeMirrorContentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];

			for (const contentScript of codeMirrorContentScripts) {
				contentScripts.push({
					pluginId,
					contentScriptId: contentScript.id,
					contentScriptJs: () => shim.fsDriver().readFile(contentScript.path),
					loadCssAsset: (name: string) => {
						const assetPath = dirname(contentScript.path);
						const path = shim.fsDriver().resolveRelativePathWithinDir(assetPath, name);
						return shim.fsDriver().readFile(path, 'utf8');
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					postMessageHandler: (message: any) => {
						const plugin = PluginService.instance().pluginById(pluginId);
						return plugin.emitContentScriptMessage(contentScript.id, message);
					},
				});
			}
		}

		void editor.setContentScripts(contentScripts);
	}, [editor, props.pluginStates]);

	useEffect(() => {
		if (!editorContainerRef.current) return () => {};

		const editorProps: EditorProps = {
			...props,
			localisations: localisation(),
			onEvent: event => onEventRef.current(event),
			onLogMessage: message => onLogMessageRef.current(message),
		};

		const editor = createEditor(editorContainerRef.current, editorProps);
		editor.addStyles({
			'.cm-scroller': { overflow: 'auto' },
			'&.CodeMirror': {
				height: 'unset',
				background: 'unset',
				overflow: 'unset',
				direction: 'unset',
			},
		});
		setEditor(editor);

		return () => {
			editor.remove();
		};
	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Should run just once
	}, []);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const searchState = editor.getSearchState();
		const externalSearchText = props.externalSearch.keywords.map(k => k.value).join(' ') || searchState.searchText;

		if (externalSearchText === searchState.searchText && searchState.dialogVisible === props.useLocalSearch) {
			return;
		}

		editor.setSearchState({
			...searchState,
			dialogVisible: props.useLocalSearch,
			searchText: externalSearchText,
		});
	}, [editor, props.externalSearch, props.useLocalSearch]);

	const theme = props.settings.themeData;
	useEffect(() => {
		if (!editor) return () => {};

		const styles = editor.addStyles({
			'& .cm-search-marker *, & .cm-search-marker': {
				color: theme.searchMarkerColor,
				backgroundColor: theme.searchMarkerBackgroundColor,
			},
			'& .cm-search-marker-selected *, & .cm-search-marker-selected': {
				background: `${theme.selectedColor2} !important`,
				color: `${theme.color2} !important`,
			},
		});

		return () => {
			styles.remove();
		};
	}, [editor, theme]);

	useEffect(() => {
		editor?.updateSettings(props.settings);
	}, [props.settings, editor]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		setupVim(editor, {
			sync: () => {
				void CommandService.instance().execute('synchronize');
			},
		});
	}, [editor]);

	useKeymap(editor);

	return (
		<div
			style={props.style}
			ref={editorContainerRef}
		></div>
	);
};

export default forwardRef(Editor);
