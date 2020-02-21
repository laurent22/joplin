import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';

const markupLanguageUtils = require('lib/markupLanguageUtils');
const Setting = require('lib/models/Setting');
const Note = require('lib/models/Note');
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToMd = require('lib/HtmlToMd');
const dialogs = require('./dialogs');
const { themeStyle } = require('../theme.js');

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

export async function valueToMarkdown(value:any):string {
	const htmlToMd = new HtmlToMd();
	let md = htmlToMd.parse(value);
	md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
	return md;
}


function findBlockSource(node) {
	const sources = lastClickedEditableNode_.getElementsByClassName('joplin-source');
	if (!sources.length) throw new Error('No source for node');
	return sources[0].textContent;
}

let lastClickedEditableNode_ = null;

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
				content_css: 'node_modules/katex/dist/katex.css',
				valid_elements: '*[*]', // TODO: filter more,
				// toolbar: 'customInsertButton',
			});

			setEditor(editors[0]);
		};

		loadEditor();
	}, []);

	useEffect(() => {
		if (!editor) return;

		editor.ui.registry.addContextToolbar('joplinEditable', {
			predicate: function(node) {
				if (node.classList && node.classList.contains('joplin-editable')) {
					// const tinyNode = editor.selection.getNode();
					// console.info('TTTTTTTT', tinyNode);
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
			onAction: function(event) {
				const source = findBlockSource(lastClickedEditableNode_);


				editor.windowManager.open({
					title: 'Dialog Title', // The dialog's title - displayed in the dialog header
					initialData: {
						codeTextArea: source,
					},
					onSubmit: async (dialogApi) => {
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

	useEffect(() => {
		if (!editor) return;

		props.markdownToHtml(props.defaultMarkdown).then((result:string) => {
			editor.setContent(result.html);
		});
	}, [editor, props.defaultMarkdown, props.theme]);

	useEffect(() => {
		if (!editor) return;

		let onChangeHandlerIID = null;

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
			editor.off('keyup', onChangeHandler);
			editor.off('paste', onChangeHandler);
			editor.off('cut', onChangeHandler);
			editor.off('Change', onChangeHandler);
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
