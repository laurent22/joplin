/* eslint-disable multiline-comment-style */

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

	public async createFromBuffer(buffer: any, options: CreateFromBufferOptions = null): Promise<Handle> {
		return this.cacheImage(this.implementation_.nativeImage.createFromBuffer(buffer, options));
	}

	public async resize(handle: Handle, options: ResizeOptions = null) {
		const image = this.imageByHandle(handle);
		const resizedImage = image.data.resize(options);
		return this.cacheImage(resizedImage);
	}

	public async toDataUrl(handle: Handle): Promise<string> {
		const image = this.imageByHandle(handle);
		return image.data.toDataURL();
	}

	public async toBase64(handle: Handle) {
		const dataUrl = await this.toDataUrl(handle);
		const s = dataUrl.split('base64,');
		if (s.length !== 2) throw new Error('Could not convert to base64');
		return s[1];
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
