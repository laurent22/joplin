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

// https://stackoverflow.com/a/10264318/561309
ArrayUtils.binarySearch = function(items, value) {
	var startIndex  = 0,
		stopIndex   = items.length - 1,
		middle      = Math.floor((stopIndex + startIndex)/2);

	while(items[middle] != value && startIndex < stopIndex){

		//adjust search area
		if (value < items[middle]){
			stopIndex = middle - 1;
		} else if (value > items[middle]){
			startIndex = middle + 1;
		}

		//recalculate middle
		middle = Math.floor((stopIndex + startIndex)/2);
	}

	//make sure it's the right value
	return (items[middle] != value) ? -1 : middle;
}

ArrayUtils.findByKey = function(array, key, value) {
	for (let i = 0; i < array.length; i++) {
		const o = array[i];
		if (typeof o !== 'object') continue;
		if (o[key] === value) return o;
	}
	return null;
}

module.exports = ArrayUtils;