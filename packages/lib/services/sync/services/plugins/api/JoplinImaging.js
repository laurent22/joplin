"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const Resource_1 = require("../../../models/Resource");
const Setting_1 = require("../../../models/Setting");
const shim_1 = require("../../../shim");
const getResourcePath = async (resourceId) => {
    const resource = await Resource_1.default.load(resourceId);
    if (!resource)
        throw new Error(`No such resource: ${resourceId}`);
    const resourcePath = await Resource_1.default.fullPath(resource);
    if (!(await shim_1.default.fsDriver().exists(resourcePath)))
        throw new Error(`Could not load resource path: ${resourcePath}`);
    return resourcePath;
};
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
class JoplinImaging {
    constructor(implementation) {
        this.images_ = [];
        this.implementation_ = implementation;
    }
    createImageHandle() {
        return [Date.now(), Math.random()].join(':');
    }
    imageByHandle(handle) {
        const image = this.images_.find(i => i.handle === handle);
        if (!image)
            throw new Error(`No image with handle ${handle}`);
        return image;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    cacheImage(data) {
        const handle = this.createImageHandle();
        this.images_.push({
            handle,
            data,
        });
        return handle;
    }
    // Create an image from a buffer - however only use this for very small
    // images. It requires transferring the full image data from the plugin to
    // the app, which is extremely slow and will freeze the app. Instead, use
    // `createFromPath` or `createFromResource`, which will manipulate the image
    // data directly from the main process.
    //
    // public async createFromBuffer(buffer: any, options: CreateFromBufferOptions = null): Promise<Handle> {
    // 	return this.cacheImage(this.implementation_.nativeImage.createFromBuffer(buffer, options));
    // }
    /**
     * Creates an image from the provided path. Note that images and PDFs are supported. If you
     * provide a URL instead of a local path, the file will be downloaded first then converted to an
     * image.
     */
    async createFromPath(filePath) {
        return this.cacheImage(await this.implementation_.createFromPath(filePath));
    }
    async createFromResource(resourceId) {
        return this.createFromPath(await getResourcePath(resourceId));
    }
    async createFromPdfPath(path, options) {
        const images = await this.implementation_.createFromPdf(path, options);
        return images.map(image => this.cacheImage(image));
    }
    async createFromPdfResource(resourceId, options) {
        return this.createFromPdfPath(await getResourcePath(resourceId), options);
    }
    async getPdfInfoFromPath(path) {
        return await this.implementation_.getPdfInfo(path);
    }
    async getPdfInfoFromResource(resourceId) {
        return this.getPdfInfoFromPath(await getResourcePath(resourceId));
    }
    async getSize(handle) {
        const image = this.imageByHandle(handle);
        return image.data.getSize();
    }
    async resize(handle, options = null) {
        const image = this.imageByHandle(handle);
        const resizedImage = image.data.resize(options);
        return this.cacheImage(resizedImage);
    }
    async crop(handle, rectangle) {
        const image = this.imageByHandle(handle);
        const croppedImage = image.data.crop(rectangle);
        return this.cacheImage(croppedImage);
    }
    // Warning: requires transferring the complete image from the app to the
    // plugin which may freeze the app. Consider using one of the `toXxxFile()`
    // or `toXxxResource()` methods instead.
    //
    // public async toDataUrl(handle: Handle): Promise<string> {
    // 	const image = this.imageByHandle(handle);
    // 	return image.data.toDataURL();
    // }
    // Warnings: requires transferring the complete image from the app to the
    // plugin which may freeze the app. Consider using one of the `toXxxFile()`
    // or `toXxxResource()` methods instead.
    //
    // public async toBase64(handle: Handle) {
    // 	const dataUrl = await this.toDataUrl(handle);
    // 	const s = dataUrl.split('base64,');
    // 	if (s.length !== 2) throw new Error('Could not convert to base64');
    // 	return s[1];
    // }
    async toPngFile(handle, filePath) {
        const image = this.imageByHandle(handle);
        const data = image.data.toPNG();
        await shim_1.default.fsDriver().writeFile(filePath, data, 'buffer');
    }
    /**
     * Quality is between 0 and 100
     */
    async toJpgFile(handle, filePath, quality = 80) {
        const image = this.imageByHandle(handle);
        const data = image.data.toJPEG(quality);
        await shim_1.default.fsDriver().writeFile(filePath, data, 'buffer');
    }
    tempFilePath(ext) {
        return `${Setting_1.default.value('tempDir')}/${Date.now()}_${Math.random()}.${ext}`;
    }
    /**
     * Creates a new Joplin resource from the image data. The image will be
     * first converted to a JPEG.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async toJpgResource(handle, resourceProps, quality = 80) {
        const tempFilePath = this.tempFilePath('jpg');
        await this.toJpgFile(handle, tempFilePath, quality);
        const newResource = await shim_1.default.createResourceFromPath(tempFilePath, resourceProps, { resizeLargeImages: 'never' });
        await shim_1.default.fsDriver().remove(tempFilePath);
        return newResource;
    }
    /**
     * Creates a new Joplin resource from the image data. The image will be
     * first converted to a PNG.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async toPngResource(handle, resourceProps) {
        const tempFilePath = this.tempFilePath('png');
        await this.toPngFile(handle, tempFilePath);
        const newResource = await shim_1.default.createResourceFromPath(tempFilePath, resourceProps, { resizeLargeImages: 'never' });
        await shim_1.default.fsDriver().remove(tempFilePath);
        return newResource;
    }
    /**
     * Image data is not automatically deleted by Joplin so make sure you call
     * this method on the handle once you are done.
     */
    async free(handles) {
        if (!Array.isArray(handles)) {
            handles = [handles];
        }
        for (const handle of handles) {
            const index = this.images_.findIndex(i => i.handle === handle);
            if (index >= 0)
                this.images_.splice(index, 1);
        }
    }
}
exports.default = JoplinImaging;
