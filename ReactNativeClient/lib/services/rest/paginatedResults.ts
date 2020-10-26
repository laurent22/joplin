import modelFeed from 'lib/models/utils/modelFeed';
import { Request } from './Api';
import requestFields from './requestFields';
import BaseModel from 'lib/BaseModel';
import requestPaginationOptions from './requestPaginationOptions';
const BaseItem = require('lib/models/BaseItem');

export default async function(modelType:number, request:Request, whereSql:string = '') {
	const ModelClass = BaseItem.getClassByItemType(modelType);
	const fields = requestFields(request, modelType);
	const pagination = requestPaginationOptions(request);
	const cursor = request.query.cursor;
	return modelFeed(BaseModel.db(), ModelClass.tableName(), pagination, cursor, whereSql, fields);
}
