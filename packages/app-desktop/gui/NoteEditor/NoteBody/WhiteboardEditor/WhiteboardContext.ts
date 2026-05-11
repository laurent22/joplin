import { createContext, useContext } from 'react';
import { MarkupLanguage } from '@joplin/renderer';
import { ResourceInfos } from '../../utils/types';
import { MarkupToHtmlOptions } from '../../../hooks/useMarkupToHtml';
import { RenderResult } from '@joplin/renderer/types';

export interface WhiteboardContextValue {
	markupToHtml: (markupLanguage: MarkupLanguage, md: string, options?: MarkupToHtmlOptions)=> Promise<RenderResult>;
	resourceInfos: ResourceInfos;
	resourceDirectory: string;
	themeId: number;
	onOpenRef: (ref: string)=> void;
	onUpdateNode: (canvasNodeId: string, patch: Record<string, unknown>)=> void;
	onPromoteTextNode: (canvasNodeId: string)=> void;
}

export const WhiteboardContext = createContext<WhiteboardContextValue | null>(null);

export const useWhiteboardContext = () => {
	const ctx = useContext(WhiteboardContext);
	if (!ctx) throw new Error('WhiteboardContext used outside provider');
	return ctx;
};
