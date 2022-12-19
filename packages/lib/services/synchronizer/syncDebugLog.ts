// The sync debug log can be used to view from a single file a sequence of sync
// related events. In particular, it logs notes and folders being saved, and the
// relevant sync operations. Enable it in app.ts

import Logger from '../../Logger';

const syncDebugLog = new Logger();

export default syncDebugLog;
