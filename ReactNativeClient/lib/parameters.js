import { Setting } from 'lib/models/setting.js';

const parameters_ = {};

parameters_.dev = {
	oneDrive: {
		id: 'cbabb902-d276-4ea4-aa88-062a5889d6dc',
		secret: 'YSvrgQMqw9NzVqgiLfuEky1',
	},
};

parameters_.prod = {
	oneDrive: {
		id: 'e09fc0de-c958-424f-83a2-e56a721d331b',
		secret: 'JA3cwsqSGHFtjMwd5XoF5L5',
	},
};

function parameters() {
	return parameters_[Setting.value('env')];
}

export { parameters }