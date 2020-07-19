import { Dirnames } from '../utils/types';

export default async function(api:any) {
	await Promise.all([
		api.put('.sync/version.txt', '2'),
		api.put('.sync/readme.txt', '2020-07-16: In the new sync format, the version number is stored in /info.json. However, for backward compatibility, we need to keep the old version.txt file here, otherwise old clients will automatically recreate it, and assume a sync target version 1. So we keep it here but set its value to "2", so that old clients know that they need to be upgraded. This directory can be removed after a year or so, once we are confident that all clients have been upgraded to recent versions.'),
		api.mkdir(Dirnames.Locks),
		api.mkdir(Dirnames.Temp),
	]);
}
