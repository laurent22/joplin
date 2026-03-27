"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HighlightedText;
const React = require("react");
function HighlightedText(props) {
    const { text, highlight } = props;
    if (!highlight) {
        return React.createElement(React.Fragment, null, text);
    }
    const parts = [];
    const query = highlight.toLowerCase();
    let currentIndex = 0;
    let matchIndex = text.toLowerCase().indexOf(query);
    while (matchIndex !== -1) {
        if (matchIndex > currentIndex) {
            parts.push({
                text: text.substring(currentIndex, matchIndex),
                highlighted: false,
            });
        }
        parts.push({
            text: text.substring(matchIndex, matchIndex + query.length),
            highlighted: true,
        });
        currentIndex = matchIndex + query.length;
        matchIndex = text.toLowerCase().indexOf(query, currentIndex);
    }
    if (currentIndex < text.length) {
        parts.push({
            text: text.substring(currentIndex),
            highlighted: false,
        });
    }
    return (React.createElement(React.Fragment, null, parts.map((part, index) => part.highlighted ? (React.createElement("span", { key: index, style: {
            backgroundColor: '#ffeb3b',
            padding: '2px',
        } }, part.text)) : (React.createElement("span", { key: index }, part.text)))));
}
//# sourceMappingURL=HighlightedText.js.map