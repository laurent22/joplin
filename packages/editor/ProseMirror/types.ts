import { RenderResult } from '../../renderer/types';
import { EditorLanguageType } from '../types';

interface MarkupToHtmlOptions {
	isFullPageRender: boolean;
	forceMarkdown: boolean;
}

export type MarkupToHtml = (markup: string, options: MarkupToHtmlOptions)=> Promise<RenderResult>;
export type HtmlToMarkup = (html: HTMLElement)=> string;

export interface RendererControl {
	renderMarkupToHtml: MarkupToHtml;
	renderHtmlToMarkup: HtmlToMarkup;
}

export interface CodeEditorControl {
	focus: ()=> void;
	remove: ()=> void;
	updateBody: (newValue: string)=> void;
	select: (from: number, to: number)=> void;
}
export type OnCodeEditorChange = (newValue: string)=> void;

// Creates a text editor for editing code blocks
export type OnCreateCodeEditor = (
	parent: HTMLElement, language: EditorLanguageType, onChange: OnCodeEditorChange,
)=> CodeEditorControl;
