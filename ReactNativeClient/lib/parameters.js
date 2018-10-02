const Setting = require('lib/models/Setting.js');

const parameters_ = {};

parameters_.dev = {
	oneDrive: {
		id: 'cbabb902-d276-4ea4-aa88-062a5889d6dc',
		secret: 'YSvrgQMqw9NzVqgiLfuEky1',
	},
	oneDriveDemo: {
		id: '606fd4d7-4dfb-4310-b8b7-a47d96aa22b6',
		secret: 'qabchuPYL7931$ePDEQ3~_$',
	},
	dropbox: {
		id: 'cx9li9ur8taq1z7',
		secret: 'i8f9a1mvx3bijrt',
	},
};

parameters_.prod = {
	oneDrive: {
		id: 'e09fc0de-c958-424f-83a2-e56a721d331b',
		secret: 'JA3cwsqSGHFtjMwd5XoF5L5',
	},
	oneDriveDemo: {
		id: '606fd4d7-4dfb-4310-b8b7-a47d96aa22b6',
		secret: 'qabchuPYL7931$ePDEQ3~_$',
	},
	dropbox: {
		id: 'm044w3cvmxhzvop',
		secret: 'r298deqisz0od56',
	},
};

function parameters(env = null) {
	if (env === null) env = Setting.value('env');
	let output = parameters_[env];
	if (Setting.value('isDemo')) {
		output.oneDrive = output.oneDriveDemo;
	}
	return output;
}

module.exports = { parameters };
