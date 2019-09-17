import Knex = require('knex');

const nodeEnv = process.env.NODE_ENV || 'development';

const knex:Knex = require('knex')({
	client: 'sqlite3',
	connection: {
		filename: __dirname + '/../../db-' + nodeEnv + '.sqlite',
	},
});

export default knex;

export enum ItemType {
    File = 1,
    User,
}

export interface WithDates {
	updated_time?: number
	created_time?: number
}

export interface WithUuid {
	id?: string
}

// AUTO-GENERATED-TYPES
// Auto-generated using `npm run generate-types`
export interface User extends WithDates, WithUuid {
	email?: string
	password?: string
	is_admin?: number
}

export interface Session extends WithDates, WithUuid {
	user_id?: string
}

export interface Permission extends WithDates, WithUuid {
	user_id?: string
	item_type?: ItemType
	item_id?: string
	is_owner?: number
	can_read?: number
	can_write?: number
}

export interface File extends WithDates, WithUuid {
	name?: string
	content?: any
	mime_type?: string
	is_directory?: number
	parent_id?: string
}
// AUTO-GENERATED-TYPES
