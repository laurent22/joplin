import { Rectangle } from './types';
export interface Implementation {
    nativeImage: any;
}
export interface CreateFromBufferOptions {
    width?: number;
    height?: number;
    scaleFactor?: number;
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
 */
export default class JoplinImaging {
    private implementation_;
    private images_;
    constructor(implementation: Implementation);
    private createImageHandle;
    private imageByHandle;
    private cacheImage;
    createFromPath(filePath: string): Promise<Handle>;
    createFromResource(resourceId: string): Promise<Handle>;
    getSize(handle: Handle): Promise<any>;
    resize(handle: Handle, options?: ResizeOptions): Promise<string>;
    crop(handle: Handle, rectange: Rectangle): Promise<string>;
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
    free(handle: Handle): Promise<void>;
}
