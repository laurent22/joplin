declare const tinymce: any;

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';

// eslint-disable-next-line no-unused-vars
import { DefaultEditorState } from './utils/NoteText';

const { MarkupToHtml } = require('lib/joplin-renderer');

export interface OnChangeEvent {
	changeId: number,
	content: any,
}

interface TinyMCEProps {
	style: any,
	onChange(event: OnChangeEvent): void,
	onWillChange(event:any): void,
	defaultEditorState: DefaultEditorState,
	markupToHtml: Function,
	attachResources: Function,
}

export async function editorContentToHtml(content:any):Promise<string> {
	return content ? content : '';
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

function findEditableContainer(node:any):any {
	while (node) {
		if (node.classList && node.classList.contains('joplin-editable')) return node;
		node = node.parentNode;
	}
	return null;
}

let loadedAssetFiles_:string[] = [];
let dispatchDidUpdateIID_:any = null;
let changeId_:number = 1;

const TinyMCE = (props:TinyMCEProps, ref:any) => {
	const [editor, setEditor] = useState(null);

	const attachResources = useRef(null);
	attachResources.current = props.attachResources;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const rootIdRef = useRef<string>(`tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`);

	const dispatchDidUpdate = (editor:any) => {
		if (dispatchDidUpdateIID_) clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	};

	const onEditorContentClick = useCallback((event:any) => {
		if (event.target && event.target.nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire('joplinChange');
			dispatchDidUpdate(editor);
		}
	}, [editor]);

	useImperativeHandle(ref, () => {
		return {
			content: () => editor ? editor.getContent() : '',
		};
	}, [editor]);

	useEffect(() => {
		loadedAssetFiles_ = [];

		const loadEditor = async () => {
			const editors = await tinymce.init({
				selector: `#${rootIdRef.current}`,
				plugins: 'noneditable link lists hr',
				noneditable_noneditable_class: 'joplin-editable', // TODO: regex
				valid_elements: '*[*]', // TODO: filter more,
				menubar: false,
				toolbar: 'bold italic | link codeformat customAttach | numlist bullist h1 h2 h3 hr',
				setup: (editor:any) => {

					function openEditDialog(editable:any) {
						const source = findBlockSource(editable);

						editor.windowManager.open({
							title: 'Edit',
							size: 'large',
							initialData: {
								codeTextArea: source.content,
							},
							onSubmit: async (dialogApi:any) => {
								const newSource = dialogApi.getData().codeTextArea;
								const md = `${source.openCharacters}${newSource}${source.closeCharacters}`;
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });
								console.info('Result', result);

								editable.outerHTML = result.html;
								source.node.textContent = newSource;
								dialogApi.close();
								editor.fire('joplinChange');
								// editor.getDoc().activeElement.blur();
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
					}

					editor.ui.registry.addButton('customAttach', {
						tooltip: 'Attach...',
						icon: 'upload',
						onAction: async function() {
							const resources = await attachResources.current();

							const html = [];
							for (const resource of resources) {
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resource.markdownTag, { bodyOnly: true });
								html.push(result.html);
							}

							editor.insertContent(html.join('\n'));
						},
					});

					editor.on('DblClick', (event:any) => {
						const editable = findEditableContainer(event.target);
						if (editable) {
							openEditDialog(editable);
						}
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
			const result = await props.markupToHtml(props.defaultEditorState.markupLanguage, props.defaultEditorState.value);
			if (cancelled) return;

			editor.setContent(result.html);

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
	}, [editor, props.markupToHtml, props.defaultEditorState, onEditorContentClick]);

	// Need to save the onChange handler to a ref to make sure
	// we call the current one from setTimeout.
	// https://github.com/facebook/react/issues/14010#issuecomment-433788147
	const props_onChangeRef = useRef<Function>();
	props_onChangeRef.current = props.onChange;

	useEffect(() => {
		if (!editor) return () => {};

		let onChangeHandlerIID:any = null;

		const onChangeHandler = () => {
			const changeId = changeId_++;
			props.onWillChange({ changeId: changeId });

			if (onChangeHandlerIID) clearTimeout(onChangeHandlerIID);

			onChangeHandlerIID = setTimeout(() => {
				onChangeHandlerIID = null;

				if (!editor) return;

				props_onChangeRef.current({
					changeId: changeId,
					content: editor.getContent(),
				});

				dispatchDidUpdate(editor);
			}, 1000);
		};

		editor.on('keyup', onChangeHandler); // TODO: don't trigger for shift, ctrl, etc.
		editor.on('paste', onChangeHandler);
		editor.on('cut', onChangeHandler);
		editor.on('joplinChange', onChangeHandler);

		return () => {
			try {
				editor.off('keyup', onChangeHandler);
				editor.off('paste', onChangeHandler);
				editor.off('cut', onChangeHandler);
				editor.off('joplinChange', onChangeHandler);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
	}, [props.onWillChange, props.onChange, editor]);

	return <div style={props.style} id={rootIdRef.current}/>;
};

export default forwardRef(TinyMCE);

