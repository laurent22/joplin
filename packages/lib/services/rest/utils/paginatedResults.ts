import { Request } from '../Api';
import requestFields from './requestFields';
import BaseModel from '../../../BaseModel';
import requestPaginationOptions from './requestPaginationOptions';
import paginatedFeed, { WhereQuery, ModelFeedPage } from '../../../models/utils/paginatedFeed';
import BaseItem from '../../../models/BaseItem';

export default async function(modelType: number, request: Request, whereQuery: WhereQuery = null, defaultFields: string[] = null): Promise<ModelFeedPage> {
	const ModelClass = BaseItem.getClassByItemType(modelType);
	const fields = requestFields(request, modelType, defaultFields);
	const pagination = requestPaginationOptions(request);
	return paginatedFeed(BaseModel.db(), ModelClass.tableName(), pagination, whereQuery, fields);
}
