/* eslint-disable multiline-comment-style */

import Resource from '../../../models/Resource';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
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

interface Image {
	handle: Handle;
	data: any;
}

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

	private cacheImage(data: any) {
		const handle = this.createImageHandle();
		this.images_.push({
			handle,
			data,
		});
		return handle;
	}

	/**
	 * Create an image from a buffer - however only use this for very small
	 * images. It requires transferring the full image data from the plugin to
	 * the app, which is extremely slow and will freeze the app. Instead, use
	 * `createFromPath` or `createFromResource`, which will manipulate the image
	 * data directly from the main process.
	 */
	public async createFromBuffer(buffer: any, options: CreateFromBufferOptions = null): Promise<Handle> {
		return this.cacheImage(this.implementation_.nativeImage.createFromBuffer(buffer, options));
	}

	public async createFromPath(filePath: string): Promise<Handle> {
		return this.cacheImage(this.implementation_.nativeImage.createFromPath(filePath));
	}

	public async createFromResource(resourceId: string): Promise<Handle> {
		const resource = await Resource.load(resourceId);
		if (!resource) throw new Error(`No such resource: ${resourceId}`);
		const resourcePath = await Resource.fullPath(resource);
		if (!(await shim.fsDriver().exists(resourcePath))) throw new Error(`Could not load resource path: ${resourcePath}`);
		return this.createFromPath(resourcePath);
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

	public async crop(handle: Handle, rectange: Rectangle) {
		const image = this.imageByHandle(handle);
		const croppedImage = image.data.crop(rectange);
		return this.cacheImage(croppedImage);
	}

	/**
	 * Warnings: requires transferring the complete image from the app to the
	 * plugin which may freeze the app. Consider using one of the `toXxxFile()`
	 * or `toXxxResource()` methods instead.
	 */
	public async toDataUrl(handle: Handle): Promise<string> {
		const image = this.imageByHandle(handle);
		return image.data.toDataURL();
	}

	/**
	 * Warnings: requires transferring the complete image from the app to the
	 * plugin which may freeze the app. Consider using one of the `toXxxFile()`
	 * or `toXxxResource()` methods instead.
	 */
	public async toBase64(handle: Handle) {
		const dataUrl = await this.toDataUrl(handle);
		const s = dataUrl.split('base64,');
		if (s.length !== 2) throw new Error('Could not convert to base64');
		return s[1];
	}

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
	public async free(handle: Handle) {
		const index = this.images_.findIndex(i => i.handle === handle);
		if (index >= 0) this.images_.splice(index, 1);
	}

}
