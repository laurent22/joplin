
const copyButtonCss = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
                .hljs {
                    position: relative;
                }

                .copyButton {
					outline: none;
                    position: absolute;
                    right: 5px;
                    top: 5px;
                    opacity: 0.3;
                    color: inherit;
                    background: inherit;
                    border: 0;
                    cursor: pointer;
                }
                
                .copyButton:hover {
                    opacity: 1;
                }
                `,
		},
	];
};

const buttonCode_ = (text)=>  {
	return (`
			const textArea = document.createElement('textarea');
			textArea.value = \`${text}\`;
			textArea.style.position = 'absolute';
			textArea.style.top = 0;
			textArea.style.left = 0;
			textArea.style.background = 'transparent';

			
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			
			try {
			const successful = document.execCommand('copy');
			} catch (err) {
			console.log(err);
			}
			document.body.removeChild(textArea);

			document.querySelector('.copyButton').innerHTML='Copied!';
			setTimeout( function() {
			document.querySelector('.copyButton').innerHTML='copy';}
			, 1500);
							`
	);
};



const buttonText = 'copy';

function addContextAssets(context) {
	if ('copy_to_clipboard' in context.pluginAssets) return;

	context.pluginAssets['copy_to_clipboard'] = copyButtonCss();
}

function installRule(markdownIt, mdOptions, ruleOptions, context) {
	const defaultRender = markdownIt.renderer.rules.fence;
	const lastTag = '</pre>';

	markdownIt.renderer.rules.fence = (tokens, idx, options, env, self) => {

		// give the rendered value og the toke!
		const renderedToken = defaultRender(tokens, idx, options, env, self);

		const token = tokens[idx];
		let text = token.content;

		// extracting text from token gives the text inside the fence block
		// with and extra new line so we removing redundant last new line
		// which was added by default while extracting text from token

		if (text) {
			text = text.replace(/\n$/,'');
		}
		let buttonCode = buttonCode_(text);
		buttonCode = markdownIt.utils.escapeHtml(buttonCode);
		// escaping HTML characters

		if (!('copy_to_clipboard' in context.pluginAssets)) {
			addContextAssets(context);
		}
		let button = [
			'<button ',
			'class="copyButton" ',
			`onclick="${buttonCode}">${buttonText}`,
			'</button>',
		];
		// negative lookahead find the last occurance of the closring </pre> tag
		const regex = /(<\/pre>)(?!.*(<\/pre>))/gm ;
		button = button.join('');
		const newRenderedToken = renderedToken.replace(regex, `${button}${lastTag}`);
		return newRenderedToken;

	};
}

module.exports = {
	install: function(context, ruleOptions) {
		return function(md, mdOptions) {
			installRule(md, mdOptions, ruleOptions, context);
		};
	},
	style: copyButtonCss,
};
