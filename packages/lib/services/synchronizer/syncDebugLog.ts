// The sync debug log can be used to view from a single file a sequence of sync
// related events. In particular, it logs notes and folders being saved, and the
// relevant sync operations.

import Logger, { TargetType } from '../../Logger';
import { homedir } from 'os';

const syncDebugLog = new Logger();
syncDebugLog.addTarget(TargetType.File, {
	path: `${homedir()}/synclog.txt`,
});

export default syncDebugLog;
