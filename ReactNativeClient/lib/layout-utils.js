const layoutUtils = {};

layoutUtils.size = function(prefered, min, max) {
	if (prefered < min) return min;
	if (typeof max !== 'undefined' && prefered > max) return max;
	return prefered;
}

module.exports = layoutUtils;