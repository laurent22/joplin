import { ClipboardContent } from './types';
interface ElectronClipboardLike {
    readText(): string;
    writeText(text: string): void;
    readHTML(): string;
    writeHTML(html: string): void;
    readImage(): {
        toDataURL(): string;
    } | null;
    writeImage(image: unknown): void;
    availableFormats(): string[];
    write(data: Record<string, unknown>): void;
}
interface ElectronNativeImageLike {
    createFromDataURL(dataUrl: string): unknown;
}
export default class JoplinClipboard {
    private electronClipboard_;
    private electronNativeImage_;
    constructor(electronClipboard: ElectronClipboardLike, electronNativeImage: ElectronNativeImageLike);
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
    write(content: ClipboardContent): Promise<void>;
}
export {};
