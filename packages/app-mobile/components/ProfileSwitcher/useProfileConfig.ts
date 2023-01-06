import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { useState } from 'react';
import { loadProfileConfig } from '../../services/profiles';

export default (updateTime: number) => {
	const [profileConfig, setProfileConfig] = useState<ProfileConfig>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const load = async () => {
			const r = await loadProfileConfig();
			if (event.cancelled) return;
			setProfileConfig(r);
		};

		void load();
	}, [updateTime]);

	return profileConfig;
};
