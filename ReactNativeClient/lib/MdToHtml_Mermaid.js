const { shim } = require('lib/shim');
const injectedJs = require('lib/rnInjectedJs/mermaid');

class MdToHtml_Mermaid {

	name() {
		return 'mermaid';
	}

	processContent(renderedTokens, content, tagType) {
		renderedTokens.push('<div class="mermaid">' + content + '</div>');
		return renderedTokens;
	}

	extraCss() {
		// Force a white background because the graphs can have various colours
		// that may not be compatible with the current theme. Also make it
		// inline-block so that the div is the same size as the content.
		return '.mermaid { background-color: white; display:inline-block; }';
	}

	injectedJavaScript() {
		return injectedJs + '\n' + 'mermaid.init();';
	}

	async loadAssets() {}

}

module.exports = MdToHtml_Mermaid;