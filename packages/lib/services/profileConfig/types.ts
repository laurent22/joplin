export interface Profile {
	name: string;
	path: string;
}

export interface ProfileConfig {
	version: number;
	currentProfile: number;
	profiles: Profile[];
}

export const defaultProfile = (): Profile => {
	return {
		name: 'Default',
		path: '.',
	};
};

export const defaultProfileConfig = (): ProfileConfig => {
	return {
		version: 1,
		currentProfile: 0,
		profiles: [defaultProfile()],
	};
};

export type ProfileSwitchClickHandler = (profileIndex: number)=> void;
