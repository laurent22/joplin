export const DefaultProfileId = 'default';
export const CurrentProfileVersion = 2;

export interface Profile {
	name: string;
	id: string;
}

export interface ProfileConfig {
	version: number;
	currentProfileId: string;
	profiles: Profile[];
}

export const defaultProfile = (): Profile => {
	return {
		name: 'Default',
		id: DefaultProfileId,
	};
};

export const defaultProfileConfig = (): ProfileConfig => {
	return {
		version: CurrentProfileVersion,
		currentProfileId: DefaultProfileId,
		profiles: [defaultProfile()],
	};
};

export type ProfileSwitchClickHandler = (profileIndex: number)=> void;
