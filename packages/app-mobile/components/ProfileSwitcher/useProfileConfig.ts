import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { useState } from 'react';
import { loadProfileConfig } from '../../services/profiles';

export default (timestamp: number = 0) => {
	const [profileConfig, setProfileConfig] = useState<ProfileConfig>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const load = async () => {
			const r = await loadProfileConfig();
			if (event.cancelled) return;
			setProfileConfig(r);
		};

		void load();
	}, [timestamp]);

	return profileConfig;
};
