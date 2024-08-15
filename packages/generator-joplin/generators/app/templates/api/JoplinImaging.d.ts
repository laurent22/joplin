import { Rectangle } from './types';
export interface CreateFromBufferOptions {
    width?: number;
    height?: number;
    scaleFactor?: number;
}
export interface CreateFromPdfOptions {
    /**
     * The first page to export. Defaults to `1`, the first page in
     * the document.
     */
    minPage?: number;
    /**
     * The number of the last page to convert. Defaults to the last page
     * if not given.
     *
     * If `maxPage` is greater than the number of pages in the PDF, all pages
     * in the PDF will be converted to images.
     */
    maxPage?: number;
    scaleFactor?: number;
}
export interface PdfInfo {
    pageCount: number;
}
export interface Implementation {
    createFromPath: (path: string) => Promise<unknown>;
    createFromPdf: (path: string, options: CreateFromPdfOptions) => Promise<unknown[]>;
    getPdfInfo: (path: string) => Promise<PdfInfo>;
}
export interface ResizeOptions {
    width?: number;
    height?: number;
    quality?: 'good' | 'better' | 'best';
}
export type Handle = string;
/**
 * Provides imaging functions to resize or process images. You create an image
 * using one of the `createFrom` functions, then use the other functions to
 * process the image.
 *
 * Images are associated with a handle which is what will be available to the
 * plugin. Once you are done with an image, free it using the `free()` function.
 *
 * [View the
 * example](https://github.com/laurent22/joplin/blob/dev/packages/app-cli/tests/support/plugins/imaging/src/index.ts)
 *
 * <span class="platform-desktop">desktop</span>
 */
export default class JoplinImaging {
    private implementation_;
    private images_;
    constructor(implementation: Implementation);
    private createImageHandle;
    private imageByHandle;
    private cacheImage;
    /**
     * Creates an image from the provided path. Note that images and PDFs are supported. If you
     * provide a URL instead of a local path, the file will be downloaded first then converted to an
     * image.
     */
    createFromPath(filePath: string): Promise<Handle>;
    createFromResource(resourceId: string): Promise<Handle>;
    createFromPdfPath(path: string, options?: CreateFromPdfOptions): Promise<Handle[]>;
    createFromPdfResource(resourceId: string, options?: CreateFromPdfOptions): Promise<Handle[]>;
    getPdfInfoFromPath(path: string): Promise<PdfInfo>;
    getPdfInfoFromResource(resourceId: string): Promise<PdfInfo>;
    getSize(handle: Handle): Promise<any>;
    resize(handle: Handle, options?: ResizeOptions): Promise<string>;
    crop(handle: Handle, rectangle: Rectangle): Promise<string>;
    toPngFile(handle: Handle, filePath: string): Promise<void>;
    /**
     * Quality is between 0 and 100
     */
    toJpgFile(handle: Handle, filePath: string, quality?: number): Promise<void>;
    private tempFilePath;
    /**
     * Creates a new Joplin resource from the image data. The image will be
     * first converted to a JPEG.
     */
    toJpgResource(handle: Handle, resourceProps: any, quality?: number): Promise<import("../../database/types").ResourceEntity>;
    /**
     * Creates a new Joplin resource from the image data. The image will be
     * first converted to a PNG.
     */
    toPngResource(handle: Handle, resourceProps: any): Promise<import("../../database/types").ResourceEntity>;
    /**
     * Image data is not automatically deleted by Joplin so make sure you call
     * this method on the handle once you are done.
     */
    free(handles: Handle[] | Handle): Promise<void>;
}
