/* eslint-disable no-unused-vars */
/* eslint-disable no-cond-assign */


// match[1] AND/OR tagName:tagValue
// match[2] AND/OR
// match[3] -
// match[4] tagName
// match[6] tagValue

module.exports = (searchString: string):any => {
	const filterRegex = /(\b(AND|OR)\s+)?(-?)([\w]+|"[^"]+")\s*(:\s*([^\s:*"]+|"[^"]+"))?/igu;

	searchString = searchString.trim();

	const filters = [];
	let match;
	while (match = filterRegex.exec(searchString)) {
		filters.push({
			name: match[4],
			relation: (match[2]) ? match[2].toUpperCase() : 'AND',
			value: match[6],
		});
	}

	return filters;
};
