import { RenderResult } from '../../renderer/types';

interface MarkupToHtmlOptions {
	isFullPageRender: boolean;
	forceMarkdown: boolean;
}

export type MarkupToHtml = (markup: string, options: MarkupToHtmlOptions)=> Promise<RenderResult>;
export type HtmlToMarkup = (html: Node|DocumentFragment)=> string;

export interface RendererControl {
	renderMarkupToHtml: MarkupToHtml;
	renderHtmlToMarkup: HtmlToMarkup;
}
