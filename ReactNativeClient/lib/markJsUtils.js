const markJsUtils = {}

markJsUtils.markKeyword = (mark, keyword, stringUtils, extraOptions = null) => {
	if (typeof keyword === 'string') {
		keyword = {
			type: 'text',
			value: keyword,
		};
	}

	const isBasicSearch = ['ja', 'zh', 'ko'].indexOf(keyword.scriptType) >= 0;




	let value = keyword.value;
	let accuracy = keyword.accuracy ? keyword.accuracy : 'exactly';
	if (isBasicSearch) accuracy = 'partially';
	if (keyword.type === 'regex') {
		accuracy = 'complementary';
		value = keyword.originalValue.substr(0, keyword.originalValue.length - 1);
	}

	mark.mark([value], Object.assign({}, {
		accuracy: accuracy,
	}, extraOptions));




	// if (keyword.type === 'regex') {
	// 	const b = '[' + stringUtils.pregQuote(' \t\n\r,.,+-*?!={}<>|:"\'()[]') + ']+';

	// 	// The capturing groups are a hack to go around the strange behaviour of the ignoreGroups property. What we want is to
	// 	// exclude the first and last matches (the boundaries). What ignoreGroups does is ignore the first X groups. So
	// 	// we put the first boundary and the keyword inside a group, that way the first groups is ignored (ignoreGroups = 1)
	// 	// the second is included. And the last boundary is dropped because it's not in any group (it's important NOT to
	// 	// put this one in a group because otherwise it cannot be excluded).
	// 	let regexString = '(' + b + ')' + '(' + stringUtils.replaceRegexDiacritics(keyword.value) + ')' + b;
	// 	if (isBasicSearch) regexString = keyword.value;

	// 	mark.markRegExp(new RegExp(regexString, 'gmi'), Object.assign({
	// 		acrossElements: true,
	// 		ignoreGroups: 1,
	// 	}, extraOptions));
	// } else {
	// 	let accuracy = keyword.accuracy ? keyword.accuracy : 'exactly';
	// 	if (isBasicSearch) accuracy = 'partially';
	// 	mark.mark([keyword.value], Object.assign({}, {
	// 		accuracy: accuracy, 
	// 	}, extraOptions));
	// }
}

if (typeof module !== 'undefined') {
	module.exports = markJsUtils;
}