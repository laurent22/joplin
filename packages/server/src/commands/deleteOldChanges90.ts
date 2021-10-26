import { Day } from '../utils/time';
import { CommandContext } from '../utils/types';

export default async function(ctx: CommandContext) {
	await ctx.models.change().deleteOldChanges(90 * Day);
}
