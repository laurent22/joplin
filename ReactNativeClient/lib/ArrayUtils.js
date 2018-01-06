const ArrayUtils = {};

ArrayUtils.unique = function(array) {
	return array.filter(function(elem, index, self) {
		return index === self.indexOf(elem);
	});
}

ArrayUtils.removeElement = function(array, element) {
	const index = array.indexOf(element);
	if (index < 0) return array;
	array.splice(index, 1);
	return array;
}

module.exports = ArrayUtils;