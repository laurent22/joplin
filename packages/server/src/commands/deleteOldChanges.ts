import { CommandContext } from '../utils/types';

export default async function(ctx: CommandContext) {
	await ctx.models.change().deleteOldChanges();
}
