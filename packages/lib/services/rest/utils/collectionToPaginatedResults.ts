import { ModelFeedPage } from '../../../models/utils/paginatedFeed';
import { Request } from '../Api';
import requestPaginationOptions from '../utils/requestPaginationOptions';

export default function(items: any[], request: Request): ModelFeedPage {
	const pagination = requestPaginationOptions(request);
	const startIndex = (pagination.page - 1) * pagination.limit;
	const itemCount = Math.min(items.length - startIndex, pagination.limit);
	const hasMore = itemCount >= pagination.limit;

	return {
		items: items.slice(startIndex, startIndex + itemCount),
		has_more: hasMore,
	};
}
