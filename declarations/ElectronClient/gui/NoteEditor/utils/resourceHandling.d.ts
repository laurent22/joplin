export declare function handleResourceDownloadMode(noteBody: string): Promise<void>;
export declare function clearResourceCache(): void;
export declare function attachedResources(noteBody: string): Promise<any>;
export declare function commandAttachFileToBody(body: string, filePaths?: string[], options?: any): Promise<string>;
export declare function resourcesStatus(resourceInfos: any): any;
export declare function handlePasteEvent(event: any): Promise<string[]>;
