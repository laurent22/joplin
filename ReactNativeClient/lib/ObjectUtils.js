const ObjectUtils = {};

ObjectUtils.sortByValue = function(object) {
	const temp = [];
	for (const k in object) {
		if (!object.hasOwnProperty(k)) continue;
		temp.push({
			key: k,
			value: object[k],
		});
	}

	temp.sort(function(a, b) {
		let v1 = a.value;
		let v2 = b.value;
		if (typeof v1 === 'string') v1 = v1.toLowerCase();
		if (typeof v2 === 'string') v2 = v2.toLowerCase();
		if (v1 === v2) return 0;
		return v1 < v2 ? -1 : +1;
	});

	const output = {};
	for (let i = 0; i < temp.length; i++) {
		const item = temp[i];
		output[item.key] = item.value;
	}

	return output;
};

ObjectUtils.fieldsEqual = function(o1, o2) {
	if ((!o1 || !o2) && o1 !== o2) return false;

	for (const k in o1) {
		if (!o1.hasOwnProperty(k)) continue;
		if (o1[k] !== o2[k]) return false;
	}

	const c1 = Object.getOwnPropertyNames(o1);
	const c2 = Object.getOwnPropertyNames(o2);

	if (c1.length !== c2.length) return false;

	return true;
};

ObjectUtils.convertValuesToFunctions = function(o) {
	const output = {};
	for (const n in o) {
		if (!o.hasOwnProperty(n)) continue;
		output[n] = () => {
			return typeof o[n] === 'function' ? o[n]() : o[n];
		};
	}
	return output;
};

ObjectUtils.isEmpty = function(o) {
	if (!o) return true;
	return Object.keys(o).length === 0 && o.constructor === Object;
};

module.exports = ObjectUtils;
