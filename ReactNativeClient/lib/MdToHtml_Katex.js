const { shim } = require('lib/shim');
const katex = require('katex');
const katexCss = require('lib/csstojs/katex.css.js');
const Setting = require('lib/models/Setting');

class MdToHtml_Katex {

	constructor() {
		this.cache_ = {};
		this.assetsLoaded_ = false;

		// Keep macros that persist across Katex blocks to allow defining a macro
		// in one block and re-using it later in other blocks.
		// https://github.com/laurent22/joplin/issues/1105
		this.macros_ = {};
	}

	name() {
		return 'katex';
	}

	processContent(renderedTokens, content, tagType) {
		try {
			const cacheKey = tagType + '_' + content;
			let renderered = null;

			if (this.cache_[cacheKey]) {
				renderered = this.cache_[cacheKey];
			} else {
				renderered = katex.renderToString(content, {
					displayMode: tagType === 'block',
					macros: this.macros_,
				});
				this.cache_[cacheKey] = renderered;
			}

			if (tagType === 'block') renderered = '<p>' + renderered + '</p>';

			renderedTokens.push(renderered);
		} catch (error) {
			renderedTokens.push('Cannot render Katex content: ' + error.message);
		}
		return renderedTokens;
	}

	extraCss() {
		return katexCss;
	}

	async loadAssets() {
		if (this.assetsLoaded_) return;

		// In node, the fonts are simply copied using copycss to where Katex expects to find them, which is under app/gui/note-viewer/fonts

		// In React Native, it's more complicated and we need to download and copy them to the right directory. Ideally, we should embed
		// them as an asset and copy them from there (or load them from there by modifying Katex CSS), but for now that will do.

		if (shim.isReactNative()) {
			// Fonts must go under the resourceDir directory because this is the baseUrl of NoteBodyViewer
			const baseDir = Setting.value('resourceDir');
			await shim.fsDriver().mkdir(baseDir + '/fonts');
			
			await shim.fetchBlob('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-beta1/fonts/KaTeX_Main-Regular.woff2', { overwrite: false, path: baseDir + '/fonts/KaTeX_Main-Regular.woff2' });
			await shim.fetchBlob('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-beta1/fonts/KaTeX_Math-Italic.woff2', { overwrite: false, path: baseDir + '/fonts/KaTeX_Math-Italic.woff2' });
			await shim.fetchBlob('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-beta1/fonts/KaTeX_Size1-Regular.woff2', { overwrite: false, path: baseDir + '/fonts/KaTeX_Size1-Regular.woff2' });
		}

		this.assetsLoaded_ = true;
	}

}

module.exports = MdToHtml_Katex;