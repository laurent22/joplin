module.exports = {
	
	getAttr: function(attrs, name, defaultValue = null) {
		for (let i = 0; i < attrs.length; i++) {
			if (attrs[i][0] === name) return attrs[i].length > 1 ? attrs[i][1] : null;
		}
		return defaultValue;
	},

};