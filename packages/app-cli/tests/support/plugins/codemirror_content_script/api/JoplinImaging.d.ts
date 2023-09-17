export interface Implementation {
    nativeImage: any;
}
export interface CreateFromBufferOptions {
    width?: number;
    height?: number;
    scaleFactor?: number;
}
export interface ResizeOptions {
    width: number;
    height: number;
    quality: 'good' | 'better' | 'best';
}
export type Handle = string;
export default class JoplinImaging {
    private implementation_;
    private images_;
    constructor(implementation: Implementation);
    private createImageHandle;
    private imageByHandle;
    private cacheImage;
    createFromBuffer(buffer: any, options: CreateFromBufferOptions): Promise<Handle>;
    resize(handle: Handle, options: ResizeOptions): Promise<string>;
    toDataUrl(handle: Handle): Promise<any>;
    free(handle: Handle): Promise<void>;
}
