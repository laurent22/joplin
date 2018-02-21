const ObjectUtils = {};

ObjectUtils.sortByValue = function(object) {
	const temp = [];
	for (let k in object) {
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
}

module.exports = ObjectUtils;