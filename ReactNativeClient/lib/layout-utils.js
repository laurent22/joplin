const layoutUtils = {};

layoutUtils.size = function(preferred, min, max) {
	if (preferred < min) return min;
	if (typeof max !== 'undefined' && preferred > max) return max;
	return preferred;
};

module.exports = layoutUtils;
