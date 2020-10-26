import BaseModel from 'lib/BaseModel';
import { Request } from '../Api';
import defaultAction from '../defaultAction';

export default function(request:Request, id:string = null, link:string = null) {
	return defaultAction(BaseModel.TYPE_MASTER_KEY, request, id, link);
}
