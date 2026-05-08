/* eslint-disable multiline-comment-style */

import { ClipboardContent } from './types';

export default class JoplinClipboard {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private electronClipboard_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private electronNativeImage_: any = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(electronClipboard: any, electronNativeImage: any) {
		this.electronClipboard_ = electronClipboard;
		this.electronNativeImage_ = electronNativeImage;
	}

	public async readText(): Promise<string> {
		return this.electronClipboard_.readText();
	}

	public async writeText(text: string): Promise<void> {
		this.electronClipboard_.writeText(text);
	}

	/** <span class="platform-desktop">desktop</span> */
	public async readHtml(): Promise<string> {
		return this.electronClipboard_.readHTML();
	}

	/** <span class="platform-desktop">desktop</span> */
	public async writeHtml(html: string): Promise<void> {
		this.electronClipboard_.writeHTML(html);
	}

	/**
	 * Returns the image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	public async readImage(): Promise<string> {
		const image = this.electronClipboard_.readImage();
		return image ? image.toDataURL() : '';
	}

	/**
	 * Takes an image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
	 *
	 * <span class="platform-desktop">desktop</span>
	 */
	public async writeImage(dataUrl: string): Promise<void> {
		this.electronClipboard_.writeImage(this.electronNativeImage_.createFromDataURL(dataUrl));
	}

	/**
	 * Returns the list available formats (mime types).
	 *
	 * For example [ 'text/plain', 'text/html' ]
	 */
	public async availableFormats(): Promise<string[]> {
		return this.electronClipboard_.availableFormats();
	}

	/**
	 * Writes multiple formats to the clipboard simultaneously.
	 * This allows setting both text/plain and text/html at the same time.
	 *
	 * <span class="platform-desktop">desktop</span>
	 *
	 * @example
	 * ```typescript
	 * await joplin.clipboard.write({
	 *   text: 'Plain text version',
	 *   html: '<strong>HTML version</strong>'
	 * });
	 * ```
	 */
	public async write(content: ClipboardContent): Promise<void> {
		const clipboardData: Record<string, unknown> = {};

		if (content.text !== undefined) {
			clipboardData.text = content.text;
		}

		if (content.html !== undefined) {
			clipboardData.html = content.html;
		}

		if (content.image !== undefined) {
			clipboardData.image = this.electronNativeImage_.createFromDataURL(content.image);
		}

		// Only write to clipboard if there's actually data to write
		if (Object.keys(clipboardData).length > 0) {
			this.electronClipboard_.write(clipboardData);
		}
	}

}
