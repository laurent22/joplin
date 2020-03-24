import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';

// eslint-disable-next-line no-unused-vars
import { DefaultEditorState, OnChangeEvent, TextEditorUtils, EditorCommand } from '../utils/NoteText';

const { MarkupToHtml } = require('lib/joplin-renderer');
const taboverride = require('taboverride');
const { reg } = require('lib/registry.js');

interface TinyMCEProps {
	style: any,
	onChange(event: OnChangeEvent): void,
	onWillChange(event:any): void,
	defaultEditorState: DefaultEditorState,
	markupToHtml: Function,
	allAssets: Function,
	attachResources: Function,
	joplinHtml: Function,
	disabled: boolean,
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

function editableInnerHtml(html:string):string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const editable = temp.getElementsByClassName('joplin-editable');
	if (!editable.length) throw new Error(`Invalid joplin-editable: ${html}`);
	return editable[0].innerHTML;
}

function dialogTextArea_keyDown(event:any) {
	if (event.key === 'Tab') {
		window.requestAnimationFrame(() => event.target.focus());
	}
}

// Allows pressing tab in a textarea to input an actual tab (instead of changing focus)
// taboverride will take care of actually inserting the tab character, while the keydown
// event listener will override the default behaviour, which is to focus the next field.
function enableTextAreaTab(enable:boolean) {
	const textAreas = document.getElementsByClassName('tox-textarea');
	for (const textArea of textAreas) {
		taboverride.set(textArea, enable);

		if (enable) {
			textArea.addEventListener('keydown', dialogTextArea_keyDown);
		} else {
			textArea.removeEventListener('keydown', dialogTextArea_keyDown);
		}
	}
}

export const utils:TextEditorUtils = {
	editorContentToHtml(content:any):Promise<string> {
		return content ? content : '';
	},
};

interface TinyMceCommand {
	name: string,
	value?: any,
	ui?: boolean
}

interface JoplinCommandToTinyMceCommands {
	[key:string]: TinyMceCommand,
}

const joplinCommandToTinyMceCommands:JoplinCommandToTinyMceCommands = {
	'textBold': { name: 'mceToggleFormat', value: 'bold' },
	'textItalic': { name: 'mceToggleFormat', value: 'italic' },
	'textLink': { name: 'mceLink' },
	'search': { name: 'SearchReplace' },
};

let loadedAssetFiles_:string[] = [];
let dispatchDidUpdateIID_:any = null;
let changeId_:number = 1;

const TinyMCE = (props:TinyMCEProps, ref:any) => {
	const [editor, setEditor] = useState(null);
	const [scriptLoaded, setScriptLoaded] = useState(false);

	const attachResources = useRef(null);
	attachResources.current = props.attachResources;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const joplinHtml = useRef(null);
	joplinHtml.current = props.joplinHtml;

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
			execCommand: async (cmd:EditorCommand) => {
				if (!editor) return false;

				reg.logger().debug('TinyMce: execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'insertText') {
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, cmd.value, { bodyOnly: true });
					editor.insertContent(result.html);
				} else if (cmd.name === 'focus') {
					editor.focus();
				} else {
					commandProcessed = false;
				}

				if (commandProcessed) return true;

				if (!joplinCommandToTinyMceCommands[cmd.name]) {
					reg.logger().warn('TinyMCE: unsupported Joplin command: ', cmd);
					return false;
				}

				const tinyMceCmd:TinyMceCommand = { ...joplinCommandToTinyMceCommands[cmd.name] };
				if (!('ui' in tinyMceCmd)) tinyMceCmd.ui = false;
				if (!('value' in tinyMceCmd)) tinyMceCmd.value = null;

				editor.execCommand(tinyMceCmd.name, tinyMceCmd.ui, tinyMceCmd.value);

				return true;
			},
		};
	}, [editor]);

	// -----------------------------------------------------------------------------------------
	// Load the TinyMCE library. The lib loads additional JS and CSS files on startup
	// (for themes), and so it needs to be loaded via <script> tag. Requiring it from the
	// module would not load these extra files.
	// -----------------------------------------------------------------------------------------

	const loadScript = async (script:any) => {
		return new Promise((resolve) => {
			let element:any = document.createElement('script');
			if (script.src.indexOf('.css') >= 0) {
				element = document.createElement('link');
				element.rel = 'stylesheet';
				element.href = script.src;
			} else {
				element.src = script.src;

				if (script.attrs) {
					for (const attr in script.attrs) {
						element[attr] = script.attrs[attr];
					}
				}
			}

			element.id = script.id;

			element.onload = () => {
				resolve();
			};

			document.getElementsByTagName('head')[0].appendChild(element);
		});
	};

	useEffect(() => {
		let cancelled = false;

		async function loadScripts() {
			const scriptsToLoad:any[] = [
				{
					src: 'node_modules/tinymce/tinymce.min.js',
					id: 'tinyMceScript',
					loaded: false,
				},
				{
					src: 'gui/editors/TinyMCE/plugins/lists.js',
					id: 'tinyMceListsPluginScript',
					loaded: false,
				},
			];

			for (const s of scriptsToLoad) {
				if (document.getElementById(s.id)) {
					s.loaded = true;
					continue;
				}

				console.info('Loading script', s.src);

				await loadScript(s);
				if (cancelled) return;

				s.loaded = true;
			}

			setScriptLoaded(true);
		}

		loadScripts();

		return () => {
			cancelled = true;
		};
	}, []);

	// -----------------------------------------------------------------------------------------
	// Enable or disable the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!editor) return;
		editor.setMode(props.disabled ? 'readonly' : 'design');
	}, [editor, props.disabled]);

	// -----------------------------------------------------------------------------------------
	// Create and setup the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!scriptLoaded) return;

		loadedAssetFiles_ = [];

		const loadEditor = async () => {
			const editors = await (window as any).tinymce.init({
				selector: `#${rootIdRef.current}`,
				width: '100%',
				height: '100%',
				resize: false,
				plugins: 'noneditable link joplinLists hr searchreplace codesample',
				noneditable_noneditable_class: 'joplin-editable', // Can be a regex too
				valid_elements: '*[*]', // We already filter in sanitize_html
				menubar: false,
				branding: false,
				toolbar: 'bold italic | link codeformat codesample joplinAttach | numlist bullist joplinChecklist | h1 h2 h3 hr blockquote',
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
								const md = `${source.openCharacters}${newSource.trim()}${source.closeCharacters}`;
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });

								// markupToHtml will return the complete editable HTML, but we only
								// want to update the inner HTML, so as not to break additional props that
								// are added by TinyMCE on the main node.
								editable.innerHTML = editableInnerHtml(result.html);
								dialogApi.close();
								editor.fire('joplinChange');
								dispatchDidUpdate(editor);
							},
							onClose: () => {
								enableTextAreaTab(false);
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

						window.requestAnimationFrame(() => {
							enableTextAreaTab(true);
						});
					}

					editor.ui.registry.addButton('joplinAttach', {
						tooltip: 'Attach...',
						icon: 'upload',
						onAction: async function() {
							const resources = await attachResources.current();
							if (!resources.length) return;

							const html = [];
							for (const resource of resources) {
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resource.markdownTag, { bodyOnly: true });
								html.push(result.html);
							}

							editor.insertContent(html.join('\n'));
							editor.fire('joplinChange');
							dispatchDidUpdate(editor);
						},
					});

					// TODO: remove event on unmount?
					editor.on('DblClick', (event:any) => {
						const editable = findEditableContainer(event.target);
						if (editable) openEditDialog(editable);
					});

					editor.on('ObjectResized', function(event:any) {
						if (event.target.nodeName === 'IMG') {
							editor.fire('joplinChange');
							dispatchDidUpdate(editor);
						}
					});
				},
			});

			setEditor(editors[0]);
		};

		loadEditor();
	}, [scriptLoaded]);

	// -----------------------------------------------------------------------------------------
	// Set the initial content and load the plugin CSS and JS files
	// -----------------------------------------------------------------------------------------

	const loadDocumentAssets = (editor:any, pluginAssets:any[]) => {
		const cssFiles = ['css/fork-awesome.min.css'].concat(pluginAssets
			.filter((a:any) => a.mime === 'text/css' && !loadedAssetFiles_.includes(a.path))
			.map((a:any) => a.path));

		const jsFiles = pluginAssets
			.filter((a:any) => a.mime === 'application/javascript' && !loadedAssetFiles_.includes(a.path))
			.map((a:any) => a.path);

		for (const cssFile of cssFiles) loadedAssetFiles_.push(cssFile);
		for (const jsFile of jsFiles) loadedAssetFiles_.push(jsFile);

		console.info('loadDocumentAssets: files to load', cssFiles, jsFiles);

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
	};

	useEffect(() => {
		if (!editor) return () => {};

		let cancelled = false;

		const loadContent = async () => {
			const result = await props.markupToHtml(props.defaultEditorState.markupLanguage, props.defaultEditorState.value, {
				plugins: {
					checkbox: {
						renderingType: 2,
					},
				},
			});
			if (cancelled) return;

			editor.setContent(result.html);

			await loadDocumentAssets(editor, await props.allAssets(props.defaultEditorState.markupLanguage));

			editor.getDoc().addEventListener('click', onEditorContentClick);

			dispatchDidUpdate(editor);
		};

		loadContent();

		return () => {
			cancelled = true;
			editor.getDoc().removeEventListener('click', onEditorContentClick);
		};
	}, [editor, props.markupToHtml, props.allAssets, props.defaultEditorState, onEditorContentClick]);

	// -----------------------------------------------------------------------------------------
	// Handle onChange event
	// -----------------------------------------------------------------------------------------

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

		const onExecCommand = (event:any) => {
			const c:string = event.command;
			if (!c) return;

			// We need to dispatch onChange for these commands:
			//
			// InsertHorizontalRule
			// InsertOrderedList
			// InsertUnorderedList
			// mceInsertContent
			// mceToggleFormat
			//
			// Any maybe others, so to catch them all we only check the prefix

			const changeCommands = ['mceBlockQuote', 'ToggleJoplinChecklistItem'];

			if (changeCommands.includes(c) || c.indexOf('Insert') === 0 || c.indexOf('mceToggle') === 0 || c.indexOf('mceInsert') === 0) {
				onChangeHandler();
			}
		};

		// Keypress means that a printable key (letter, digit, etc.) has been
		// pressed so we want to always trigger onChange in this case
		const onKeypress = () => {
			onChangeHandler();
		};

		// KeyUp is triggered for any keypress, including Control, Shift, etc.
		// so most of the time we don't want to trigger onChange. We trigger
		// it however for the keys that might change text, such as Delete or
		// Backspace. It's not completely accurate though because if user presses
		// Backspace at the beginning of a note or Delete at the end, we trigger
		// onChange even though nothing is changed. The alternative would be to
		// check the content before and after, but this is too slow, so let's
		// keep it this way for now.
		const onKeyUp = (event:any) => {
			if (['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)) {
				onChangeHandler();
			}
		};

		editor.on('keyup', onKeyUp);
		editor.on('keypress', onKeypress);
		editor.on('paste', onChangeHandler);
		editor.on('cut', onChangeHandler);
		editor.on('joplinChange', onChangeHandler);
		editor.on('ExecCommand', onExecCommand);

		return () => {
			try {
				editor.off('keyup', onKeyUp);
				editor.off('keypress', onKeypress);
				editor.off('paste', onChangeHandler);
				editor.off('cut', onChangeHandler);
				editor.off('joplinChange', onChangeHandler);
				editor.off('ExecCommand', onExecCommand);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
	}, [props.onWillChange, props.onChange, editor]);

	return <div style={props.style} id={rootIdRef.current}/>;
};

export default forwardRef(TinyMCE);

