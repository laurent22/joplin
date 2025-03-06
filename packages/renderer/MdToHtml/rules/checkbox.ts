import { RuleOptions } from '../../MdToHtml';

let checkboxIndex_ = -1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function pluginAssets(theme: any) {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				/*
					FOR THE MARKDOWN EDITOR
				*/

				/* Remove the indentation from the checkboxes at the root of the document
				   (otherwise they are too far right), but keep it for their children to allow
				   nested lists. Make sure this value matches the UL margin. */

				li.md-checkbox {
					list-style-type: none;
				}

				li.md-checkbox input[type=checkbox] {
					margin-left: -1.71em;
					margin-right: 0.7em;
					position: relative;
					top: 1px;
				}
				
				ul.joplin-checklist {
					list-style:none;
				}

				/*
					FOR THE RICH TEXT EDITOR
				*/

				ul.joplin-checklist li::before {
					content:"\\f14a";
					font-family:"Font Awesome 5 Free";
					background-size: 16px 16px;
					pointer-events: all;
					cursor: pointer;
					width: 1em;
					height: 1em;
					margin-left: -1.3em;
					position: absolute;
					color: ${theme.color};
				}

				.joplin-checklist li:not(.checked)::before {
					content:"\\f0c8";
				}`,
		},
	];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function createPrefixTokens(Token: any, id: string, checked: boolean, label: string, postMessageSyntax: string, sourceToken: any, disabled: boolean): any[] {
	let token = null;
	const tokens = [];

	// A bit hard to handle errors here and it's unlikely that the token won't have a valid
	// map parameter, but if it does set it to a very high value, which will be more easy to notice
	// in calling code.
	const lineIndex = sourceToken.map && sourceToken.map.length ? sourceToken.map[0] : 99999999;
	const checkedString = checked ? 'checked' : 'unchecked';

	const labelId = `cb-label-${id}`;

	const js = `
		try {
			if (this.checked) {
				this.setAttribute('checked', 'checked');
			} else {
				this.removeAttribute('checked');
			}

			${postMessageSyntax}('checkboxclick:${checkedString}:${lineIndex}');
			const label = document.getElementById("${labelId}");
			label.classList.remove(this.checked ? 'checkbox-label-unchecked' : 'checkbox-label-checked');
			label.classList.add(this.checked ? 'checkbox-label-checked' : 'checkbox-label-unchecked');
		} catch (error) {
			console.warn('Checkbox ${checkedString}:${lineIndex} error', error);
		}
		return true;
	`;

	token = new Token('checkbox_wrapper_open', 'div', 1);
	token.attrs = [['class', 'checkbox-wrapper']];
	tokens.push(token);

	token = new Token('checkbox_input', 'input', 0);
	token.attrs = [['type', 'checkbox'], ['id', id], ['onclick', js]];
	if (disabled) token.attrs.push(['disabled', 'disabled']);
	if (checked) token.attrs.push(['checked', 'checked']);
	tokens.push(token);

	token = new Token('label_open', 'label', 1);
	token.attrs = [['id', labelId], ['for', id], ['class', `checkbox-label-${checkedString}`]];
	tokens.push(token);

	if (label) {
		token = new Token('text', '', 0);
		token.content = label;
		tokens.push(token);
	}

	return tokens;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function createSuffixTokens(Token: any): any[] {
	return [
		new Token('label_close', 'label', -1),
		new Token('checkbox_wrapper_close', 'div', -1),
	];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function checkboxPlugin(markdownIt: any, options: RuleOptions) {
	const renderingType = options.checkboxRenderingType || 1;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	markdownIt.core.ruler.push('checkbox', (state: any) => {
		const tokens = state.tokens;
		const Token = state.Token;

		const checkboxPattern = /^\[([x|X| ])\] (.*)$/;
		let currentListItem = null;
		let processedFirstInline = false;
		const lists = [];
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'bullet_list_open') {
				lists.push(token);
				continue;
			}

			if (token.type === 'bullet_list_close') {
				lists.pop();
				continue;
			}

			if (token.type === 'list_item_open') {
				currentListItem = token;
				processedFirstInline = false;
				continue;
			}

			if (token.type === 'list_item_close') {
				currentListItem = null;
				processedFirstInline = false;
				continue;
			}

			// Note that we only support list items that start with "-" (not with "*")
			if (currentListItem && currentListItem.markup === '-' && !processedFirstInline && token.type === 'inline') {
				processedFirstInline = true;
				const firstChild = token.children && token.children.length ? token.children[0] : null;
				if (!firstChild) continue;

				const matches = checkboxPattern.exec(firstChild.content);
				if (!matches || matches.length < 2) continue;

				const checked = matches[1] !== ' ';
				const label = matches.length >= 3 ? matches[2] : '';

				const currentList = lists[lists.length - 1];

				if (renderingType === 1) {
					checkboxIndex_++;
					const id = `md-checkbox-${checkboxIndex_}`;

					// Prepend the text content with the checkbox markup and the opening <label> tag
					// then append the </label> tag at the end of the text content.

					const prefix = createPrefixTokens(Token, id, checked, label, options.postMessageSyntax, token, !!options.checkboxDisabled);
					const suffix = createSuffixTokens(Token);

					token.children = markdownIt.utils.arrayReplaceAt(token.children, 0, prefix);
					token.children = token.children.concat(suffix);

					// Add a class to the <li> container so that it can be targetted with CSS.

					let itemClass = currentListItem.attrGet('class');
					if (!itemClass) itemClass = '';
					itemClass += ' md-checkbox joplin-checkbox';
					currentListItem.attrSet('class', itemClass.trim());
				} else {
					const textToken = new Token('text', '', 0);
					textToken.content = label;
					const tokens = [];
					tokens.push(textToken);

					token.children = markdownIt.utils.arrayReplaceAt(token.children, 0, tokens);

					const listClass = currentList.attrGet('class') || '';
					if (listClass.indexOf('joplin-') < 0) currentList.attrSet('class', (`${listClass} joplin-checklist`).trim());

					if (checked) {
						currentListItem.attrSet('class', (`${currentListItem.attrGet('class') || ''} checked`).trim());
					}
				}
			}
		}
	});
}

export default {
	plugin: checkboxPlugin,
	assets: pluginAssets,
};
