import * as React from 'react';
import { ForwardedRef } from 'react';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorProps, PluginData } from '@joplin/editor/types';
import createEditor from '@joplin/editor/CodeMirror/createEditor';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';

interface Props extends EditorProps {
	style: React.CSSProperties;
	pluginStates: PluginStates;
}

const Editor = (props: Props, ref: ForwardedRef<CodeMirrorControl>) => {
	const editorContainerRef = useRef<HTMLDivElement>();
	const [editor, setEditor] = useState<CodeMirrorControl|null>(null);

	useImperativeHandle(ref, () => {
		return editor;
	}, [editor]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const plugins: PluginData[] = [];
		for (const pluginId in props.pluginStates) {
			const pluginState = props.pluginStates[pluginId];
			const codeMirrorContentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];

			for (const contentScript of codeMirrorContentScripts) {
				plugins.push({
					pluginId,
					contentScriptId: contentScript.id,
					contentScriptJs: () => shim.fsDriver().readFile(contentScript.path),
					postMessageHandler: (message: any) => {
						const plugin = PluginService.instance().pluginById(pluginId);
						return plugin.emitContentScriptMessage(contentScript.id, message);
					},
				});
			}
		}

		void editor.setPlugins(plugins);
	}, [editor, props.pluginStates]);

	useEffect(() => {
		if (!editorContainerRef.current) return () => {};

		const editor = createEditor(editorContainerRef.current, props);
		editor.addStyles({
			'.cm-scroller': { overflow: 'auto' },
		});
		setEditor(editor);

		return () => {
			editor.remove();
		};
	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Should run just once
	}, []);

	useEffect(() => {
		editor?.updateSettings(props.settings);
	}, [props.settings, editor]);

	return (
		<div
			style={props.style}
			ref={editorContainerRef}
		></div>
	);
};

export default forwardRef(Editor);
