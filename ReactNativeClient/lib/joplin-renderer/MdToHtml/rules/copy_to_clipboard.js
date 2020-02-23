// For Encoding and decoding
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

const copyStyle = `
.code-n-btn-wrapper	{
	position:	relative;
}
.copy-code-wrapper	{
	display:	none;
	position:	absolute;
	top:4px;
	right:	4px;
}
.copy-code-wrapper	button	{
		background:	#fff;
		border:	1px	solid	#777;
		padding:	3.5px	8px;
		border-radius:	5px;
		font-weight:	500;
		cursor:	pointer;
}
.code-n-btn-wrapper:hover	.copy-code-wrapper{
	display:	block;
}
.u-mdic-copy-notify	{
	display:	none;
	padding:	4px	10px;
	background:	#fff;
	color:	#777;
	font-size:0.9rem;
	margin:	0	10px;
	border-radius:	10px;
}
`;

function generateUuid() {
	return `${+Date.now()}-${parseInt(Math.random() * 100000)}`;
}

let copyCode = `
(function	(button)	{
	const	markdownItCopy	=	{
		async	copy(text	=	'')	{
			if	(!navigator.clipboard)	{
				console.error('no	clipboard	support');
			}	else	{
				try	{
					await	navigator.clipboard.writeText(text);
				}	catch	(e)	{
					console.error(e);
				}
			}
		},
		async	buttonClick(_btn)	{
			const	copyButtonDataSet	=	_btn	&&	_btn.dataset	?	_btn.dataset	:	{};
			const	notifyId	=	copyButtonDataSet.mdicNotifyId;
			const	copyNotify	=	document.getElementById(notifyId);
			const	notifyDelayTime	=	copyButtonDataSet.mdicNotifyDelay;
			const	copyFailText	=	copyButtonDataSet.mdicCopyFailText;
			try	{
				await	markdownItCopy.copy(copyButtonDataSet.mdicContent);
				copyNotify.style.display	=	'inline';
				setTimeout(()	=>	{
					copyNotify.style.display	=	'none';
				},	notifyDelayTime);
			}	catch	(e)	{
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
	let successText = 'copied!';
	let successTextDelay = 2000;
	const [tokens, idx] = args;
	const content = entities.encode(tokens[idx].content);
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
		`onclick="${copyCode}">copy</button>`,
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
