import * as React from 'react';
import { useState, useEffect } from 'react';

declare var tinymce: any;

// const markupLanguageUtils = require('lib/markupLanguageUtils');
// const Setting = require('lib/models/Setting');
const Note = require('lib/models/Note');
// const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToMd = require('lib/HtmlToMd');
// const dialogs = require('./dialogs');
// const { themeStyle } = require('../theme.js');

// const Setting = require('lib/models/Setting');
// const markupLanguageUtils = require('lib/markupLanguageUtils');


interface TinyMCEProps {
	style: any,
	editorState: any,
	onChange: Function,
	defaultMarkdown: string,
	theme: any,
	markdownToHtml: Function,
}

export interface TinyMCEChangeEvent {
	editorState: any,
}

// function mdToHtmlRender() {
// 	const markupToHtml = markupLanguageUtils.newMarkupToHtml({
// 		resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
// 	});

// 	const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, theme, {
// 		codeTheme: theme.codeThemeCss,
// 		// userCss: this.props.customCss ? this.props.customCss : '',
// 		// resources: await shared.attachedResources(noteBody),
// 		resources: [],
// 		postMessageSyntax: 'ipcProxySendToHost',
// 		splitted: true,
// 	});
// }

// Update turndown

// defaultMarkdown
// editorState
// onChange

// export async function markdownToValue(md:string, themeId:any):any {
// 	if (!md) return '';

// 	const theme = themeStyle(themeId);

// 	console.info('===================================');

// 	console.info('Markdown', md);

// 	md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });

// 	const markupToHtml = markupLanguageUtils.newMarkupToHtml({
// 		resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
// 	});

// 	const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, theme, {
// 		codeTheme: theme.codeThemeCss,
// 		// userCss: this.props.customCss ? this.props.customCss : '',
// 		// resources: await shared.attachedResources(noteBody),
// 		resources: [],
// 		postMessageSyntax: 'ipcProxySendToHost',
// 		splitted: true,
// 	});

// 	console.info('RESULT', result);

// 	console.info('===================================');


// 	return result.html;
// }

let lastClickedEditableNode_:any = null;

export async function valueToMarkdown(value:any):Promise<string> {
	const htmlToMd = new HtmlToMd();
	let md = htmlToMd.parse(value);
	md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
	return md;
}


function findBlockSource(node:any) {
	const sources = node.getElementsByClassName('joplin-source');
	if (!sources.length) throw new Error('No source for node');
	return sources[0].textContent;
}


export default function TinyMCE(props:TinyMCEProps) {
	const [editor, setEditor] = useState(null);
	const editorState = props.editorState ? props.editorState : '';

	const rootId = `tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`;

	useEffect(() => {
		const loadEditor = async () => {
			const editors = await tinymce.init({
				selector: `#${rootId}`,
				plugins: 'noneditable',
				noneditable_noneditable_class: 'joplin-katex-block', // TODO: regex
				valid_elements: '*[*]', // TODO: filter more,
				// toolbar: 'customInsertButton',
			});

			setEditor(editors[0]);
		};

		loadEditor();
	}, []);

	useEffect(() => {
		if (!editor) return;

		const loadContent = async () => {
			const result = await props.markdownToHtml(props.defaultMarkdown);
			if (!result) return;

			editor.setContent(result.html);

			const cssFiles = result.pluginAssets.filter((a:any) => a.mime === 'text/css').map((a:any) => a.path);
			console.info('cssFiles', cssFiles);
			editor.dom.loadCSS(cssFiles.join(','));
		};

		loadContent();
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
			text: 'My Button',
			onAction: function() {
				const source = findBlockSource(lastClickedEditableNode_);


				editor.windowManager.open({
					title: 'Dialog Title', // The dialog's title - displayed in the dialog header
					initialData: {
						codeTextArea: source,
					},
					onSubmit: async (dialogApi:any) => {
						const result = await props.markdownToHtml(`$$\n${dialogApi.getData().codeTextArea}\n$$`);
						lastClickedEditableNode_.innerHTML = result.html;
						dialogApi.close();
					},
					body: {
						type: 'panel', // The root body type - a Panel or TabPanel
						items: [ // A list of panel components
							{
								type: 'textarea', // A HTML panel component
								name: 'codeTextArea',
								value: source,
							},
						],
					},
					buttons: [ // A list of footer buttons
						{
							type: 'submit',
							text: 'OK',
						},
					],
				});
				// editor.insertContent('&nbsp;<strong>It\'s my button!</strong>&nbsp;');
			},
		});
	}, [editor, props.markdownToHtml]);

	// const addPluginAssets = function(container:any, assets:any[]) {
	// 	if (!assets) return;

	// 	for (let i = 0; i < assets.length; i++) {
	// 		const asset = assets[i];
	// 		// if (pluginAssetsAdded_[asset.name]) continue;
	// 		// pluginAssetsAdded_[asset.name] = true;

	// 		if (asset.mime === 'application/javascript') {
	// 			const script = document.createElement('script');
	// 			script.src = asset.path;
	// 			container.appendChild(script);
	// 		} else if (asset.mime === 'text/css') {
	// 			const link = document.createElement('link');
	// 			link.rel = 'stylesheet';
	// 			link.href = asset.path;
	// 			container.appendChild(link);
	// 		}
	// 	}
	// }

	useEffect(() => {
		if (!editor) return () => {};

		let onChangeHandlerIID:any = null;

		const onChangeHandler = () => {
			if (onChangeHandlerIID) clearTimeout(onChangeHandlerIID);
			onChangeHandlerIID = setTimeout(() => {
				onChangeHandlerIID = null;
				props.onChange({ editorState: editor.getContent() });
			}, 5);
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

	useEffect(() => {
		if (!editor) return;
		if (editorState === editor.getContent()) return;
		editor.setContent(editorState);
	}, [editor, editorState]);

	return <div style={props.style} id={rootId}/>;
}

// rules.katexScriptBlock = {
//   filter: function (node) {
//     const className = node.getAttribute('class');
//     return className && className.indexOf('joplin-katex-block') >= 0;
//   },

//   escapeContent: function() {
//     return false;
//   },

//   replacement: function (content, node, options) {
//     const source = findKatexBlockSource(node);
//     if (!source) return '**Katex Block: Could not find source**';
//     return '$$\n' + source + '\n$$';
//   }
// };

// rules.katexScriptInline = {
//   filter: function (node) {
//     const className = node.getAttribute('class');
//     return className && className.indexOf('joplin-katex-inline') >= 0;
//   },

//   escapeContent: function() {
//     return false;
//   },

//   replacement: function (content, node, options) {
//     const source = findKatexBlockSource(node);
//     if (!source) return '**Katex Inline: Could not find source**';
//     return '$' + source + '$';
//   }
// };
