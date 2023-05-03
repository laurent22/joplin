const markJsUtils = {};

const isInsideContainer = (node, tagName) => {
	if (!node) return false;

	tagName = tagName.toLowerCase();

	while (node) {
		if (node.tagName && node.tagName.toLowerCase() === tagName) return true;
		node = node.parentNode;
	}

	return false;
};

markJsUtils.markKeyword = (mark, keyword, stringUtils, extraOptions = null) => {
	if (typeof keyword === 'string') {
		keyword = {
			type: 'text',
			value: keyword,
		};
	}

	const isBasicSearch = ['ja', 'zh', 'ko'].indexOf(keyword.scriptType) >= 0;

	let value = keyword.value;
	let accuracy = keyword.accuracy ? keyword.accuracy : { value: 'exactly', limiters: ':;.,-–—‒_(){}[]!\'"+='.split('') };
	if (isBasicSearch) accuracy = 'partially';
	if (keyword.type === 'regex') {
		accuracy = 'complementary';
		// Remove the trailing wildcard and "accuracy = complementary" will take
		// care of highlighting the relevant keywords.

		// Known bug: it will also highlight word that contain the term as a
		// suffix for example for "ent*", it will highlight "present" which is
		// incorrect (it should only highlight what starts with "ent") but for
		// now will do. Mark.js doesn't have an option to tweak this behaviour.
		value = keyword.value.substr(0, keyword.value.length - 1);
	}

	mark.mark(
		[value],
		Object.assign(
			{},
			{
				accuracy: accuracy,
				filter: (node, _term, _totalCounter, _counter) => {
					// We exclude SVG because it creates a "<mark>" tag inside
					// the document, which is not a valid SVG tag. As a result
					// the content within that tag disappears.
					//
					// mark.js has an "exclude" parameter, but it doesn't work
					// so we use "filter" instead.
					//
					// https://github.com/joplin/plugin-abc-sheet-music
					if (isInsideContainer(node, 'SVG')) return false;
					return true;
				},
			},
			extraOptions
		)
	);
};

if (typeof module !== 'undefined') {
	module.exports = markJsUtils;
}
