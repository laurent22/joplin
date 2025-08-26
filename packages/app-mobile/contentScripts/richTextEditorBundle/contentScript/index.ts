import '../../utils/polyfills';
import { createEditor } from '@joplin/editor/ProseMirror';
import { EditorProcessApi, EditorProps, MainProcessApi } from '../types';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { MarkupLanguage } from '@joplin/renderer/types';
import '@joplin/editor/ProseMirror/styles';
import readFileToBase64 from '../../utils/readFileToBase64';
import { EditorLanguageType } from '@joplin/editor/types';
import convertHtmlToMarkdown from './convertHtmlToMarkdown';
import { ExportedWebViewGlobals as MarkdownEditorWebViewGlobals } from '../../markdownEditorBundle/types';
import { EditorEventType } from '@joplin/editor/events';

const postprocessHtml = (html: HTMLElement) => {
	// Fix resource URLs
	const resources = html.querySelectorAll<HTMLImageElement>('img[data-resource-id]');
	for (const resource of resources) {
		const resourceId = resource.getAttribute('data-resource-id');
		resource.src = `:/${resourceId}`;
	}

	// Restore HREFs
	const links = html.querySelectorAll<HTMLAnchorElement>('a[href="#"][data-original-href]');
	for (const link of links) {
		link.href = link.getAttribute('data-original-href');
		link.removeAttribute('data-original-href');
	}

	return html;
};

const wrapHtmlForMarkdownConversion = (html: HTMLElement) => {
	// Add a container element -- when converting to HTML, Turndown
	// sometimes doesn't process the toplevel element in the same way
	// as other elements (e.g. in the case of Joplin source blocks).
	const wrapper = html.ownerDocument.createElement('div');
	wrapper.appendChild(html.cloneNode(true));
	return wrapper;
};


const htmlToMarkdown = (html: HTMLElement): string => {
	return convertHtmlToMarkdown(html);
};

export const initialize = async (
	{
		settings,
		initialText,
		initialNoteId,
		parentElementClassName,
		initialSearch,
	}: EditorProps,
	markdownEditorApi: MarkdownEditorWebViewGlobals,
) => {
	const messenger = new WebViewToRNMessenger<EditorProcessApi, MainProcessApi>('rich-text-editor', null);
	const parentElement = document.getElementsByClassName(parentElementClassName)[0];
	if (!parentElement) throw new Error('Parent element not found');
	if (!(parentElement instanceof HTMLElement)) {
		throw new Error('Parent node is not an element.');
	}

	const assetContainer = document.createElement('div');
	assetContainer.id = 'joplin-container-pluginAssetsContainer';
	document.body.appendChild(assetContainer);

	const editor = await createEditor(parentElement, {
		settings,
		initialText,
		initialNoteId,
		onLocalize: messenger.remoteApi.onLocalize,

		onPasteFile: async (data) => {
			const base64 = await readFileToBase64(data);
			await messenger.remoteApi.onPasteFile(data.type, base64);
		},
		onLogMessage: (message: string) => {
			void messenger.remoteApi.logMessage(message);
		},
		onEvent: (event) => {
			void messenger.remoteApi.onEditorEvent(event);
		},
	}, {
		renderMarkupToHtml: async (markup, options) => {
			let language = MarkupLanguage.Markdown;
			if (settings.language === EditorLanguageType.Html && !options.forceMarkdown) {
				language = MarkupLanguage.Html;
			}

			return await messenger.remoteApi.onRender({
				markup,
				language,
			}, {
				pluginAssetContainerSelector: `#${assetContainer.id}`,
				splitted: true,
				mapsToLine: true,
				removeUnusedPluginAssets: options.isFullPageRender,
			});
		},
		renderHtmlToMarkup: (html) => {
			if (settings.language === EditorLanguageType.Markdown) {
				return htmlToMarkdown(wrapHtmlForMarkdownConversion(html));
			} else {
				return html.outerHTML;
			}
		},
	}, (parent, language, onChange) => {
		return markdownEditorApi.createEditorWithParent({
			initialText: '',
			initialNoteId: '',
			parentElementOrClassName: parent,
			settings: { ...editor.getSettings(), language },
			onEvent: (event) => {
				if (event.kind === EditorEventType.Change) {
					onChange(event.value);
				}
			},
		});
	});
	editor.setSearchState(initialSearch);

	messenger.setLocalInterface({
		editor,
	});

	return editor;
};

export { default as setUpLogger } from '../../utils/setUpLogger';

