"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkupLanguageUtils = void 0;
const markdownUtils_1 = require("./markdownUtils");
const Setting_1 = require("./models/Setting");
const shim_1 = require("./shim");
const MarkupToHtml_1 = require("@joplin/renderer/MarkupToHtml");
const htmlUtils_1 = require("./htmlUtils");
const Resource_1 = require("./models/Resource");
const renderer_1 = require("@joplin/renderer");
class MarkupLanguageUtils {
    lib_(language) {
        if (language === renderer_1.MarkupLanguage.Html)
            return htmlUtils_1.default;
        if (language === renderer_1.MarkupLanguage.Markdown)
            return markdownUtils_1.default;
        throw new Error(`Unsupported markup language: ${language}`);
    }
    extractImageUrls(language, text) {
        let urls = [];
        if (language === renderer_1.MarkupLanguage.Any) {
            urls = urls.concat(this.lib_(renderer_1.MarkupLanguage.Markdown).extractImageUrls(text));
            urls = urls.concat(this.lib_(renderer_1.MarkupLanguage.Html).extractImageUrls(text));
        }
        else {
            urls = this.lib_(language).extractImageUrls(text);
        }
        return urls;
    }
    extractPdfUrls(language, text) {
        let urls = [];
        if (language === renderer_1.MarkupLanguage.Any) {
            urls = urls.concat(this.lib_(renderer_1.MarkupLanguage.Markdown).extractPdfUrls(text));
            urls = urls.concat(this.lib_(renderer_1.MarkupLanguage.Html).extractPdfUrls(text));
        }
        else {
            urls = this.lib_(language).extractPdfUrls(text);
        }
        return urls;
    }
    // Create a new MarkupToHtml instance while injecting options specific to Joplin
    // desktop and mobile applications.
    newMarkupToHtml(_plugins = null, options = null) {
        const subValues = Setting_1.default.subValues('markdown.plugin', Setting_1.default.toPlainObject());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const pluginOptions = {};
        for (const n in subValues) {
            pluginOptions[n] = { enabled: subValues[n] };
        }
        options = Object.assign({ ResourceModel: Resource_1.default, pluginOptions: pluginOptions, tempDir: Setting_1.default.value('tempDir'), fsDriver: shim_1.default.fsDriver(), isSafeMode: Setting_1.default.value('isSafeMode') }, options);
        return new MarkupToHtml_1.default(options);
    }
}
exports.MarkupLanguageUtils = MarkupLanguageUtils;
const markupLanguageUtils = new MarkupLanguageUtils();
exports.default = markupLanguageUtils;
