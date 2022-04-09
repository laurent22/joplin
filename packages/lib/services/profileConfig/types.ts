export interface Profile {
	name: string;
	isRelative: boolean;
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
		isRelative: true,
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
