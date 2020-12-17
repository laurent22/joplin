import { Change, ChangeType, ItemType, Uuid } from '../db';
import BaseModel from './BaseModel';
import { defaultPagination, paginateDbQuery, PaginatedResults, Pagination, PaginationOrderDir } from './utils/pagination';

export interface PaginatedChanges extends PaginatedResults {
	items: Change[];
}

export default class ChangeModel extends BaseModel {

	public get tableName(): string {
		return 'changes';
	}

	public async add(itemType:ItemType, itemId:Uuid, changeType:ChangeType):Promise<Change> {
		const change:Change = {
			item_type: itemType,
			item_id: itemId,
			type: changeType,
			owner_id: this.userId,
		};
		
		return this.save(change);
	}

	public async byOwnerId(ownerId:string, pagination: Pagination): Promise<PaginatedChanges> { {
		// For changes, we always sort by updated_time ASC as anything else
		// would not make sense.
		pagination = {
			...pagination,
			order: [{
				by: 'updated_time',
				dir: PaginationOrderDir.ASC,
			}],
		}

		const query = this.db(this.tableName).select(...this.defaultFields).where('owner_id', ownerId);
		return paginateDbQuery(query, pagination);
	}

}
