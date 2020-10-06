interface LinkStoreEntry {
    link: string;
    noteX: number;
    noteY: number;
}
declare class LinkSelector {
    noteId_: string;
    scrollTop_: number;
    renderedText_: string;
    currentLinkIndex_: number;
    linkStore_: LinkStoreEntry[];
    linkRegex_: RegExp;
    constructor();
    get link(): string | null;
    get noteX(): number | null;
    get noteY(): number | null;
    findLinks(renderedText: string): LinkStoreEntry[];
    updateText(renderedText: string): void;
    updateNote(textWidget: any): void;
    scrollWidget(textWidget: any): void;
    changeLink(textWidget: any, offset: number): void | null;
    openLink(textWidget: any): void;
}
export default LinkSelector;
