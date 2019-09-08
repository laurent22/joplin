const EncryptionService = require('lib/services/EncryptionService');
const { _ } = require('lib/locale.js');
const BaseItem = require('lib/models/BaseItem.js');
const Setting = require('lib/models/Setting.js');

const shared = {};

shared.constructor = function(comp) {
	comp.state = {
		masterKeys: [],
		passwords: {},
		passwordChecks: {},
		stats: {
			encrypted: null,
			total: null,
		},
	};
	comp.isMounted_ = false;

	comp.refreshStatsIID_ = null;
};

shared.initState = function(comp, props) {
	comp.setState(
		{
			masterKeys: props.masterKeys,
			passwords: props.passwords ? props.passwords : {},
		},
		() => {
			comp.checkPasswords();
		}
	);

	comp.refreshStats();

	if (comp.refreshStatsIID_) {
		clearInterval(comp.refreshStatsIID_);
		comp.refreshStatsIID_ = null;
	}

	comp.refreshStatsIID_ = setInterval(() => {
		if (!comp.isMounted_) {
			clearInterval(comp.refreshStatsIID_);
			comp.refreshStatsIID_ = null;
			return;
		}
		comp.refreshStats();
	}, 3000);
};

shared.refreshStats = async function(comp) {
	const stats = await BaseItem.encryptedItemsStats();
	comp.setState({ stats: stats });
};

shared.checkPasswords = async function(comp) {
	const passwordChecks = Object.assign({}, comp.state.passwordChecks);
	for (let i = 0; i < comp.state.masterKeys.length; i++) {
		const mk = comp.state.masterKeys[i];
		const password = comp.state.passwords[mk.id];
		const ok = password ? await EncryptionService.instance().checkMasterKeyPassword(mk, password) : false;
		passwordChecks[mk.id] = ok;
	}
	comp.setState({ passwordChecks: passwordChecks });
};

shared.decryptedStatText = function(comp) {
	const stats = comp.state.stats;
	const doneCount = stats.encrypted !== null ? stats.total - stats.encrypted : '-';
	const totalCount = stats.total !== null ? stats.total : '-';
	return _('Decrypted items: %s / %s', doneCount, totalCount);
};

shared.onSavePasswordClick = function(comp, mk) {
	const password = comp.state.passwords[mk.id];
	if (!password) {
		Setting.deleteObjectKey('encryption.passwordCache', mk.id);
	} else {
		Setting.setObjectKey('encryption.passwordCache', mk.id, password);
	}

	comp.checkPasswords();
};

shared.onPasswordChange = function(comp, mk, password) {
	const passwords = comp.state.passwords;
	passwords[mk.id] = password;
	comp.setState({ passwords: passwords });
};

module.exports = shared;
