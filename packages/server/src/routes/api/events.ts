import { ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';

interface Event {
	name: string;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
const supportedEvents: Record<string, Function> = {
	syncStart: async (_ctx: AppContext) => {
		// await ctx.joplin.models.share().updateSharedItems2(ctx.joplin.owner.id);
	},
};

const router = new Router(RouteType.Api);

router.post('api/events', async (_path: SubPath, ctx: AppContext) => {
	const event = await bodyFields<Event>(ctx.req);
	if (!supportedEvents[event.name]) throw new ErrorNotFound(`Unknown event name: ${event.name}`);
	await supportedEvents[event.name](ctx);
});

export default router;
