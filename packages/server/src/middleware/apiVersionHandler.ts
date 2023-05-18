import { AppContext, KoaNext } from '../utils/types';
import { isApiRequest } from '../utils/requestUtils';
import config from '../config';
import { ErrorPreconditionFailed } from '../utils/errors';
const compareVersions = require('compare-versions');

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	if (!isApiRequest(ctx)) return next();

	const joplinServerVersion = config().joplinServerVersion;
	const minVersion = ctx.headers['x-api-min-version'];

	// For now we don't require this header to be set to keep compatibility with
	// older clients.
	if (!minVersion) return next();

	const diff = compareVersions(joplinServerVersion, minVersion);

	// We only throw an error if the client requires a version of Joplin Server
	// that's ahead of what's installed. This is mostly to automatically notify
	// those who self-host so that they know they need to upgrade Joplin Server.
	if (diff < 0) {
		throw new ErrorPreconditionFailed(`Joplin Server v${minVersion} is required but v${joplinServerVersion} is installed. Please upgrade Joplin Server.`);
	}

	return next();
}
