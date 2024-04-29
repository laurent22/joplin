/* eslint-disable multiline-comment-style */

import Resource from '../../../models/Resource';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
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
	createFromPath: (path: string)=> Promise<unknown>;
	createFromPdf: (path: string, options: CreateFromPdfOptions)=> Promise<unknown[]>;
	getPdfInfo: (path: string)=> Promise<PdfInfo>;
}

export interface ResizeOptions {
	width?: number;
	height?: number;
	quality?: 'good' | 'better' | 'best';
}

export type Handle = string;

interface Image {
	handle: Handle;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	data: any;
}

const getResourcePath = async (resourceId: string): Promise<string> => {
	const resource = await Resource.load(resourceId);
	if (!resource) throw new Error(`No such resource: ${resourceId}`);
	const resourcePath = await Resource.fullPath(resource);
	if (!(await shim.fsDriver().exists(resourcePath))) throw new Error(`Could not load resource path: ${resourcePath}`);
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
export default class JoplinImaging {

	private implementation_: Implementation;
	private images_: Image[] = [];

	public constructor(implementation: Implementation) {
		this.implementation_ = implementation;
	}

	private createImageHandle(): Handle {
		return [Date.now(), Math.random()].join(':');
	}

	private imageByHandle(handle: Handle) {
		const image = this.images_.find(i => i.handle === handle);
		if (!image) throw new Error(`No image with handle ${handle}`);
		return image;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private cacheImage(data: any) {
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
	public async createFromPath(filePath: string): Promise<Handle> {
		return this.cacheImage(await this.implementation_.createFromPath(filePath));
	}

	public async createFromResource(resourceId: string): Promise<Handle> {
		return this.createFromPath(await getResourcePath(resourceId));
	}

	public async createFromPdfPath(path: string, options?: CreateFromPdfOptions): Promise<Handle[]> {
		const images = await this.implementation_.createFromPdf(path, options);
		return images.map(image => this.cacheImage(image));
	}

	public async createFromPdfResource(resourceId: string, options?: CreateFromPdfOptions): Promise<Handle[]> {
		return this.createFromPdfPath(await getResourcePath(resourceId), options);
	}

	public async getPdfInfoFromPath(path: string): Promise<PdfInfo> {
		return await this.implementation_.getPdfInfo(path);
	}

	public async getPdfInfoFromResource(resourceId: string): Promise<PdfInfo> {
		return this.getPdfInfoFromPath(await getResourcePath(resourceId));
	}

	public async getSize(handle: Handle) {
		const image = this.imageByHandle(handle);
		return image.data.getSize();
	}

	public async resize(handle: Handle, options: ResizeOptions = null) {
		const image = this.imageByHandle(handle);
		const resizedImage = image.data.resize(options);
		return this.cacheImage(resizedImage);
	}

	public async crop(handle: Handle, rectangle: Rectangle) {
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

	public async toPngFile(handle: Handle, filePath: string) {
		const image = this.imageByHandle(handle);
		const data = image.data.toPNG();
		await shim.fsDriver().writeFile(filePath, data, 'buffer');
	}

	/**
	 * Quality is between 0 and 100
	 */
	public async toJpgFile(handle: Handle, filePath: string, quality = 80) {
		const image = this.imageByHandle(handle);
		const data = image.data.toJPEG(quality);
		await shim.fsDriver().writeFile(filePath, data, 'buffer');
	}

	private tempFilePath(ext: string) {
		return `${Setting.value('tempDir')}/${Date.now()}_${Math.random()}.${ext}`;
	}

	/**
	 * Creates a new Joplin resource from the image data. The image will be
	 * first converted to a JPEG.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async toJpgResource(handle: Handle, resourceProps: any, quality = 80) {
		const tempFilePath = this.tempFilePath('jpg');
		await this.toJpgFile(handle, tempFilePath, quality);
		const newResource = await shim.createResourceFromPath(tempFilePath, resourceProps, { resizeLargeImages: 'never' });
		await shim.fsDriver().remove(tempFilePath);
		return newResource;
	}

	/**
	 * Creates a new Joplin resource from the image data. The image will be
	 * first converted to a PNG.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async toPngResource(handle: Handle, resourceProps: any) {
		const tempFilePath = this.tempFilePath('png');
		await this.toPngFile(handle, tempFilePath);
		const newResource = await shim.createResourceFromPath(tempFilePath, resourceProps, { resizeLargeImages: 'never' });
		await shim.fsDriver().remove(tempFilePath);
		return newResource;
	}

	/**
	 * Image data is not automatically deleted by Joplin so make sure you call
	 * this method on the handle once you are done.
	 */
	public async free(handles: Handle[]|Handle) {
		if (!Array.isArray(handles)) {
			handles = [handles];
		}

		for (const handle of handles) {
			const index = this.images_.findIndex(i => i.handle === handle);
			if (index >= 0) this.images_.splice(index, 1);
		}
	}

}
