export default class JoplinClipboard {
    private electronClipboard_;
    private electronNativeImage_;
    constructor(electronClipboard: any, electronNativeImage: any);
    readText(): Promise<string>;
    writeText(text: string): Promise<void>;
    /** <span class="platform-desktop">desktop</span> */
    readHtml(): Promise<string>;
    /** <span class="platform-desktop">desktop</span> */
    writeHtml(html: string): Promise<void>;
    /**
     * Returns the image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
     *
     * <span class="platform-desktop">desktop</span>
     */
    readImage(): Promise<string>;
    /**
     * Takes an image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
     *
     * <span class="platform-desktop">desktop</span>
     */
    writeImage(dataUrl: string): Promise<void>;
    /**
     * Returns the list available formats (mime types).
     *
     * For example [ 'text/plain', 'text/html' ]
     */
    availableFormats(): Promise<string[]>;
}
