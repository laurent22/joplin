import { htmlentities } from '@joplin/utils/html';
const Mark = require('mark.js/dist/mark.min.js');
const markJsUtils = require('@joplin/lib/markJsUtils');
const { replaceRegexDiacritics, pregQuote } = require('@joplin/lib/string-utils');

const getNoteTitleHtml = (highlightedWords: string[], displayTitle: string) => {
	if (highlightedWords.length) {
		const titleElement = document.createElement('span');
		titleElement.textContent = displayTitle;
		const mark = new Mark(titleElement, {
			exclude: ['img'],
			acrossElements: true,
		});

		mark.unmark();

		try {
			for (const wordToBeHighlighted of highlightedWords) {
				markJsUtils.markKeyword(mark, wordToBeHighlighted, {
					pregQuote: pregQuote,
					replaceRegexDiacritics: replaceRegexDiacritics,
				});
			}
		} catch (error) {
			if (error.name !== 'SyntaxError') {
				throw error;
			}
			// An error of 'Regular expression too large' might occour in the markJs library
			// when the input is really big, this catch is here to avoid the application crashing
			// https://github.com/laurent22/joplin/issues/7634
			// console.error('Error while trying to highlight words from search: ', error);
		}

		// Note: in this case it is safe to use dangerouslySetInnerHTML because titleElement
		// is a span tag that we created and that contains data that's been inserted as plain text
		// with `textContent` so it cannot contain any XSS attacks. We use this feature because
		// mark.js can only deal with DOM elements.
		// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
		return titleElement.outerHTML;
	} else {
		return htmlentities(displayTitle);
	}
};

export default getNoteTitleHtml;
