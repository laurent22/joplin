export default class JoplinClipboard {

	private electronClipboard_: any = null;
	private electronNativeImage_: any = null;

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

	public async readHtml(): Promise<string> {
		return this.electronClipboard_.readHTML();
	}

	public async writeHtml(html: string): Promise<void> {
		this.electronClipboard_.writeHTML(html);
	}

	/**
	 * Returns the image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
	 */
	public async readImage(): Promise<string> {
		const image = this.electronClipboard_.readImage();
		return image ? image.toDataURL() : '';
	}

	/**
	 * Takes an image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
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

}
