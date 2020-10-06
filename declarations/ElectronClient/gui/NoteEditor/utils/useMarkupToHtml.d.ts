import { ResourceInfos } from './types';
interface HookDependencies {
    themeId: number;
    customCss: string;
}
interface MarkupToHtmlOptions {
    replaceResourceInternalToExternalLinks?: boolean;
    resourceInfos?: ResourceInfos;
}
export default function useMarkupToHtml(dependencies: HookDependencies): (markupLanguage: number, md: string, options?: MarkupToHtmlOptions) => Promise<any>;
export {};
