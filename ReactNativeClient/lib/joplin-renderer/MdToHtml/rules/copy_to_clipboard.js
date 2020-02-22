const copyStyle = `
.code-n-btn-wrapper {
  positon: relative;
}
.copy-code-wrapper {
  display: none;
  position: absolute;
  right: 0;
  margin: 10px 15px 0 0;
}
.copy-code-wrapper button {
   background: #fff;
   border: none;
   padding: 10px;
   cursor: pointer;
}
.copy-code-wrapper button i {
font-size: 1rem;
}
.code-n-btn-wrapper:hover .copy-code-wrapper{
  display: block;
}
.u-mdic-copy-notify {
  display: none;
  padding: 4px 12px;
  background: #fff;
  color: #ccc;
  font-size:0.9rem;
  margin: 0 10px;
  border-radius: 10px;
}
`;

function generateUuid() {
	return `${+Date.now()}-${parseInt(Math.random() * 100000)}`;
}

function strEncode(str = '') {
	if (!str || str.length === 0) {
		return '';
	}
	return str
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&apos;')
		.replace(/"/g, '&quot;');
}

let copyCode = `
(function (button) {
            const markdownItCopy = {
                async copy(text = '') {
                    if (!navigator.clipboard) {
                        console.error('no clipboard support');
                    } else {
                        try {
                            await navigator.clipboard.writeText(text);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                },
                async buttonClick(_btn) {
                    const copyButtonDataSet = _btn && _btn.dataset ? _btn.dataset : {};
                    const notifyId = copyButtonDataSet.mdicNotifyId;
                    const copyNotify = document.getElementById(notifyId);
                    const notifyDelayTime = copyButtonDataSet.mdicNotifyDelay;
                    const copyFailText = copyButtonDataSet.mdicCopyFailText;
                    try {
                        await markdownItCopy.copy(copyButtonDataSet.mdicContent);
                        copyNotify.style.display = 'inline';
                        setTimeout(() => {
                            copyNotify.style.display = 'none';
                        }, notifyDelayTime);
                    } catch (e) {
                        alert(copyFailText);
                    }
                },
            };
            markdownItCopy.buttonClick(button);
  }(this));  
`;
const enhance = (render) => (...args) => {
	/* args = [tokens, idx, options, env, slf] */
	let failText = 'copy fail';
	let successText = 'copied';
	let successTextDelay = 2000;
	const [tokens, idx] = args;
	const content = strEncode(tokens[idx].content || '');
	const uuid = `j-notify-${generateUuid()}`;
	const buttonBuilder = [
		'<div class="copy-code-wrapper">',
		`<span class="u-mdic-copy-notify" id="${uuid}">${successText}</span>`,
		'<button ',
		'class="u-mdic-copy-btn j-mdic-copy-btn" ',
		`data-mdic-content="${content}" `,
		`data-mdic-notify-id="${uuid}" `,
		`data-mdic-notify-delay="${successTextDelay}" `,
		`data-mdic-copy-fail-text="${failText}" `,
		`onclick="${copyCode}"><i class="fa fa-copy"></i></button>`,
		'</div>',
	];
	const copyTag = buttonBuilder.join('');
	const originResult = render.apply(this, args);

	if (originResult.includes('class="hljs"')) {
		const newResult = `<div class="code-n-btn-wrapper">${copyTag}${originResult}</div>`;
		return newResult;
	} else {
		return originResult;
	}
};

function addContextAssets(context) {
	if (!('copy' in context.pluginAssets)) {
		context.pluginAssets['copy'] = [{
			inline: true,
			text: copyStyle,
			mime: 'text/css',
		}];
	}
}

function installRule(md, context) {
	const codeBlockRender = md.renderer.rules.code_block;
	const fenceRender = md.renderer.rules.fence;

	md.renderer.rules.code_block = enhance(codeBlockRender);
	md.renderer.rules.fence = enhance(fenceRender);
	addContextAssets(context);
}

module.exports = function(context) {
	return function(md) {
		installRule(md, context);
	};
};
