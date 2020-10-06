export declare function cursorPositionToTextOffset(cursorPos: any, body: string): number;
export declare function usePrevious(value: any): any;
export declare function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function): {
    resetScroll: () => void;
    setEditorPercentScroll: (p: number) => void;
    setViewerPercentScroll: (p: number) => void;
    editor_scroll: () => void;
};
export declare function useRootSize(dependencies: any): {
    width: number;
    height: number;
};
