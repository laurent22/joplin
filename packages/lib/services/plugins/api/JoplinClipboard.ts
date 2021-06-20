const { clipboard, nativeImage } = require('electron');

export default class JoplinClipboard {

	public async readText(): Promise<string> {
		return clipboard.readText();
	}

	public async writeText(text: string): Promise<void> {
		clipboard.writeText(text);
	}

	public async readHtml(): Promise<string> {
		return clipboard.readHTML();
	}

	public async writeHtml(html: string): Promise<void> {
		clipboard.writeHTML(html);
	}

	/**
	 * Returns the image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
	 */
	public async readImage(): Promise<string> {
		const image = clipboard.readImage();
		return image ? image.toDataURL() : '';
	}

	/**
	 * Takes an image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
	 */
	public async writeImage(dataUrl: string): Promise<void> {
		clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
	}

	/**
	 * Returns the list available formats (mime types).
	 *
	 * For example [ 'text/plain', 'text/html' ]
	 */
	public async availableFormats(): Promise<string[]> {
		return clipboard.availableFormats();
	}

}
