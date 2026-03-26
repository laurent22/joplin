"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const HighlightedText = props => {
    if (!props.searchQuery || props.searchQuery.length === 0) {
        return React.createElement(React.Fragment, null, props.text);
    }
    const query = props.searchQuery.toLowerCase();
    const lowerText = props.text.toLowerCase();
    const parts = [];
    let lastIndex = 0;
    // Find all occurrences of the search query
    let index = 0;
    while ((index = lowerText.indexOf(query, lastIndex)) !== -1) {
        // Add text before match
        if (index > lastIndex) {
            parts.push({
                text: props.text.substring(lastIndex, index),
                highlighted: false,
            });
        }
        // Add matched text
        parts.push({
            text: props.text.substring(index, index + query.length),
            highlighted: true,
        });
        lastIndex = index + query.length;
    }
    // Add remaining text
    if (lastIndex < props.text.length) {
        parts.push({
            text: props.text.substring(lastIndex),
            highlighted: false,
        });
    }
    // If no matches were found, just return the original text
    if (parts.length === 0) {
        return React.createElement(React.Fragment, null, props.text);
    }
    return (React.createElement(React.Fragment, null, parts.map((part, index) => (part.highlighted ? (React.createElement("mark", { key: index, style: { backgroundColor: '#ffeb3b', padding: '0 2px' } }, part.text)) : (React.createElement("span", { key: index }, part.text))))));
};
exports.default = HighlightedText;
//# sourceMappingURL=HighlightedText.js.map