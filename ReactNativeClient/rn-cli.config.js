// Workaround for https://github.com/oblador/react-native-vector-icons/issues/627

const blacklist = require('metro/src/blacklist')
module.exports = {
	getBlacklistRE () {
		return blacklist([/react-native\/local-cli\/core\/__fixtures__.*/])
	},
}