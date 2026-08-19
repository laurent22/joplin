import Setting from './models/Setting';

type Env = 'dev' | 'prod' | 'test';

export interface AppCredentials {
	id: string;
	secret: string;
}

interface ParametersForEnv {
	oneDrive?: AppCredentials;
	oneDriveDemo?: AppCredentials;
	oneDriveTest?: AppCredentials;
	dropbox?: AppCredentials;
}

// cSpell:disable
const parameters_: Record<Env, ParametersForEnv> = {
	test: {
		oneDriveTest: {
			id: 'f1e68e1e-a729-4514-b041-4fdd5c7ac03a',
			secret: '~PC7cwAC_AXGICk_V0~12SmI9lbaC-MBDT',
		},
	},

	dev: {
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
	},

	prod: {
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
	},
};
// cSpell:enable

let envOverride_: Env | null = null;
const setEnvOverride = (env: Env) => {
	envOverride_ = env;
};

const parameters = (env: Env | null = null): ParametersForEnv => {
	if (envOverride_) env = envOverride_;
	if (env === null) env = Setting.value('env') as Env;
	let output = parameters_[env];
	if (Setting.value('isDemo')) {
		output = { ...output, oneDrive: output.oneDriveDemo };
	}
	return output;
};

export { parameters, setEnvOverride };
