const ArrayUtils = {};

ArrayUtils.unique = function(array) {
	return array.filter(function(elem, index, self) {
		return index === self.indexOf(elem);
	});
}

module.exports = ArrayUtils;