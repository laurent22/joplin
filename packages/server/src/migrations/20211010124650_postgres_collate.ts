import { DbConnection, setCollateC } from '../db';

export async function up(db: DbConnection): Promise<any> {
	// await setCollateC(db, 'api_clients', 'id');
	// await setCollateC(db, 'changes', 'id');
	// await setCollateC(db, 'changes', 'item_id');
	// await setCollateC(db, 'changes', 'user_id');
	// await setCollateC(db, 'emails', 'recipient_id');
	// await setCollateC(db, 'item_resources', 'item_id');
	// await setCollateC(db, 'item_resources', 'resource_id');
	// await setCollateC(db, 'items', 'id');
	// await setCollateC(db, 'items', 'jop_id');
	// await setCollateC(db, 'items', 'jop_parent_id');
	// await setCollateC(db, 'items', 'jop_share_id');
	// await setCollateC(db, 'notifications', 'id');
	// await setCollateC(db, 'notifications', 'owner_id');
	// await setCollateC(db, 'sessions', 'id');
	// await setCollateC(db, 'sessions', 'user_id');
	// await setCollateC(db, 'share_users', 'id');
	// await setCollateC(db, 'share_users', 'share_id');
	// await setCollateC(db, 'share_users', 'user_id');
	// await setCollateC(db, 'shares', 'folder_id');
	// await setCollateC(db, 'shares', 'id');
	// await setCollateC(db, 'shares', 'item_id');
	// await setCollateC(db, 'shares', 'note_id');
	// await setCollateC(db, 'shares', 'owner_id');
	// await setCollateC(db, 'subscriptions', 'stripe_subscription_id');
	// await setCollateC(db, 'subscriptions', 'stripe_user_id');
	// await setCollateC(db, 'subscriptions', 'user_id');
	// await setCollateC(db, 'tokens', 'user_id');
	// await setCollateC(db, 'user_flags', 'user_id');
	// await setCollateC(db, 'user_items', 'item_id');
	// await setCollateC(db, 'user_items', 'user_id');
	// await setCollateC(db, 'users', 'id');
}

export async function down(_db: DbConnection): Promise<any> {

}
