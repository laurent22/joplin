const { shim } = require('lib/shim');
const mermaid = require('mermaid');
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
		return '';
	}

	injectedJavaScript() {
		return injectedJs + '\n' + 'mermaid.init();';
	}

	async loadAssets() {}

}

module.exports = MdToHtml_Mermaid;