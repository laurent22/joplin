declare const tinymce: any;

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';

interface TinyMCEProps {
	style: any,
	onChange: Function,
	defaultMarkdown: string,
	theme: any,
	markdownToHtml: Function,
	attachResources: Function,
}

export interface TinyMCEChangeEvent {
	editorState: any,
}

export async function editorStateToHtml(editorState:any):Promise<string> {
	return editorState ? editorState : '';
}

function findBlockSource(node:any) {
	const sources = node.getElementsByClassName('joplin-source');
	if (!sources.length) throw new Error('No source for node');
	const source = sources[0];

	return {
		openCharacters: source.getAttribute('data-joplin-source-open'),
		closeCharacters: source.getAttribute('data-joplin-source-close'),
		content: source.textContent,
		node: source,
	};
}

let lastClickedEditableNode_:any = null;
let loadedAssetFiles_:string[] = [];
let dispatchDidUpdateIID_:any = null;

const TinyMCE = (props:TinyMCEProps) => {
	const [editor, setEditor] = useState(null);

	const attachResources = useRef(null);
	attachResources.current = props.attachResources;

	const markdownToHtml = useRef(null);
	markdownToHtml.current = props.markdownToHtml;

	const lastChangeContent = useRef(null);

	const rootId = `tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`;

	const dispatchDidUpdate = (editor:any) => {
		if (dispatchDidUpdateIID_) clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	};

	const onEditorContentClick = useCallback((event:any) => {
		if (event.target && event.target.nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire('Change');
			dispatchDidUpdate(editor);
		}
	}, [editor]);

	useEffect(() => {
		loadedAssetFiles_ = [];

		const loadEditor = async () => {
			const editors = await tinymce.init({
				selector: `#${rootId}`,
				plugins: 'noneditable link lists hr',
				noneditable_noneditable_class: 'joplin-editable', // TODO: regex
				valid_elements: '*[*]', // TODO: filter more,
				menubar: false,
				toolbar: 'bold italic | link codeformat customAttach | numlist bullist h1 h2 h3 hr',
				setup: (editor:any) => {

					editor.ui.registry.addButton('customAttach', {
						tooltip: 'Attach...',
						icon: 'upload',
						onAction: async function() {
							const resources = await attachResources.current();

							const html = [];
							for (const resource of resources) {
								const result = await markdownToHtml.current(resource.markdownTag, { bodyOnly: true });
								html.push(result.html);
							}

							editor.insertContent(html.join('\n'));
						},
					});

				},
			});

			setEditor(editors[0]);
		};

		loadEditor();
	}, []);

	useEffect(() => {
		if (!editor) return () => {};

		let cancelled = false;

		const loadContent = async () => {
			const result = await props.markdownToHtml(props.defaultMarkdown);
			if (cancelled) return;

			editor.setContent(result.html);
			lastChangeContent.current = editor.getContent();

			const cssFiles = result.pluginAssets
				.filter((a:any) => a.mime === 'text/css' && !loadedAssetFiles_.includes(a.path))
				.map((a:any) => a.path);

			const jsFiles = result.pluginAssets
				.filter((a:any) => a.mime === 'application/javascript' && !loadedAssetFiles_.includes(a.path))
				.map((a:any) => a.path);

			for (const cssFile of cssFiles) loadedAssetFiles_.push(cssFile);
			for (const jsFile of jsFiles) loadedAssetFiles_.push(jsFile);

			if (cssFiles.length) editor.dom.loadCSS(cssFiles.join(','));

			if (jsFiles.length) {
				const editorElementId = editor.dom.uniqueId();

				for (const jsFile of jsFiles) {
					const script = editor.dom.create('script', {
						id: editorElementId,
						type: 'text/javascript',
						src: jsFile,
					});

					editor.getDoc().getElementsByTagName('head')[0].appendChild(script);
				}
			}

			editor.getDoc().addEventListener('click', onEditorContentClick);

			dispatchDidUpdate(editor);
		};

		loadContent();

		return () => {
			cancelled = true;
			editor.getDoc().removeEventListener('click', onEditorContentClick);
		};
	}, [editor, props.markdownToHtml, props.defaultMarkdown, props.theme]);

	useEffect(() => {
		if (!editor) return;

		editor.ui.registry.addContextToolbar('joplinEditable', {
			predicate: function(node:any) {
				if (node.classList && node.classList.contains('joplin-editable')) {
					lastClickedEditableNode_ = node;
					return true;
				}
				return false;
			},
			items: 'customInsertButton',
			position: 'node',
			scope: 'node',
		});

		editor.ui.registry.addButton('customInsertButton', {
			text: 'Edit',
			onAction: function() {
				const source = findBlockSource(lastClickedEditableNode_);

				editor.windowManager.open({
					title: 'Edit', // The dialog's title - displayed in the dialog header
					size: 'large',
					initialData: {
						codeTextArea: source.content,
					},
					onSubmit: async (dialogApi:any) => {
						const newSource = dialogApi.getData().codeTextArea;
						const md = `${source.openCharacters}${newSource}${source.closeCharacters}`;
						const result = await props.markdownToHtml(md);
						lastClickedEditableNode_.innerHTML = result.html;
						source.node.textContent = newSource;
						dialogApi.close();
						editor.fire('Change');
						editor.getDoc().activeElement.blur();
						dispatchDidUpdate(editor);
					},
					body: {
						type: 'panel',
						items: [
							{
								type: 'textarea',
								name: 'codeTextArea',
								value: source.content,
							},
						],
					},
					buttons: [
						{
							type: 'submit',
							text: 'OK',
						},
					],
				});
			},
		});

	}, [editor, props.markdownToHtml, props.attachResources]);

	useEffect(() => {
		if (!editor) return () => {};

		let onChangeHandlerIID:any = null;

		const onChangeHandler = () => {
			if (onChangeHandlerIID) clearTimeout(onChangeHandlerIID);
			onChangeHandlerIID = setTimeout(() => {
				onChangeHandlerIID = null;

				const content = editor.getContent();
				// The Change event for example will be fired when the text area loses
				// focus, even if nothing has changed, so we need to double-check here
				// to avoid dispatching unecessary events.
				if (lastChangeContent.current === content) return;

				lastChangeContent.current = content;
				props.onChange({
					editorState: content,
				});
				dispatchDidUpdate(editor);
			}, 500);
		};

		editor.on('keyup', onChangeHandler);
		editor.on('paste', onChangeHandler);
		editor.on('cut', onChangeHandler);
		editor.on('Change', onChangeHandler);

		return () => {
			try {
				editor.off('keyup', onChangeHandler);
				editor.off('paste', onChangeHandler);
				editor.off('cut', onChangeHandler);
				editor.off('Change', onChangeHandler);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
	}, [props.onChange, editor]);

	return <div style={props.style} id={rootId}/>;
};

export default TinyMCE;

