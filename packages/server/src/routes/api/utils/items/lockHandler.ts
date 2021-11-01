import config from '../../../../config';
import { PaginatedItems } from '../../../../models/ItemModel';
import { Value } from '../../../../models/KeyValueModel';
import { Item } from '../../../../services/database/types';
import { ErrorBadRequest } from '../../../../utils/errors';
import { SubPath } from '../../../../utils/routeUtils';
import { AppContext } from '../../../../utils/types';

interface LockHandlerResult {
	handled: boolean;
	response: any;
}

const lockHandler = async (path: SubPath, ctx: AppContext, requestBody: Buffer = null): Promise<LockHandlerResult | null> => {
	if (!config().buildInLocksEnabled) return { handled: false, response: null };

	if (!path.id || !path.id.startsWith('root:/locks/')) return { handled: false, response: null };

	const ownerId = ctx.joplin.owner.id;
	const models = ctx.joplin.models;

	const userKey = `locks::${ownerId}`;

	// PUT /api/items/root:/locks/exclusive_cli_12cb74fa9de644958b2ccbc772cb4e29.json:/content

	if (ctx.method === 'PUT') {
		const itemName = models.item().pathToName(path.id);
		const now = Date.now();

		await models.keyValue().readThenWrite(userKey, async (value: Value) => {
			const output = value ? JSON.parse(value as string) : {};
			output[itemName] = {
				name: itemName,
				updated_time: now,
				jop_updated_time: now,
				content: requestBody.toString(),
			};
			return JSON.stringify(output);
		});

		return {
			handled: true,
			response: {
				[itemName]: {
					item: {
						name: itemName,
						updated_time: now,
						id: null,
					},
					error: null,
				},
			},
		};
	}

	// DELETE /api/items/root:/locks/exclusive_cli_12cb74fa9de644958b2ccbc772cb4e29.json:

	if (ctx.method === 'DELETE') {
		const itemName = models.item().pathToName(path.id);

		await models.keyValue().readThenWrite(userKey, async (value: Value) => {
			const output = value ? JSON.parse(value as string) : {};
			delete output[itemName];
			return JSON.stringify(output);
		});

		return {
			handled: true,
			response: null,
		};
	}

	// GET /api/items/root:/locks/*:/children

	if (ctx.method === 'GET' && path.id === 'root:/locks/*:') {
		const result = await models.keyValue().value<string>(userKey);
		const obj: Record<string, Item> = result ? JSON.parse(result) : {};

		const items: Item[] = [];
		for (const name of Object.keys(obj)) {
			items.push(obj[name]);
		}

		const page: PaginatedItems = {
			has_more: false,
			items,
		};

		return {
			handled: true,
			response: page,
		};
	}

	throw new ErrorBadRequest(`Unhandled lock path: ${path.id}`);
};

export default lockHandler;
