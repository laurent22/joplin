"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
class JoplinClipboard {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(electronClipboard, electronNativeImage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.electronClipboard_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.electronNativeImage_ = null;
        this.electronClipboard_ = electronClipboard;
        this.electronNativeImage_ = electronNativeImage;
    }
    async readText() {
        return this.electronClipboard_.readText();
    }
    async writeText(text) {
        this.electronClipboard_.writeText(text);
    }
    /** <span class="platform-desktop">desktop</span> */
    async readHtml() {
        return this.electronClipboard_.readHTML();
    }
    /** <span class="platform-desktop">desktop</span> */
    async writeHtml(html) {
        this.electronClipboard_.writeHTML(html);
    }
    /**
     * Returns the image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
     *
     * <span class="platform-desktop">desktop</span>
     */
    async readImage() {
        const image = this.electronClipboard_.readImage();
        return image ? image.toDataURL() : '';
    }
    /**
     * Takes an image in [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
     *
     * <span class="platform-desktop">desktop</span>
     */
    async writeImage(dataUrl) {
        this.electronClipboard_.writeImage(this.electronNativeImage_.createFromDataURL(dataUrl));
    }
    /**
     * Returns the list available formats (mime types).
     *
     * For example [ 'text/plain', 'text/html' ]
     */
    async availableFormats() {
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
    async write(content) {
        const clipboardData = {};
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
exports.default = JoplinClipboard;
