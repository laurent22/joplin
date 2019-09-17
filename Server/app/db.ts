import Knex = require('knex');

const knex:Knex = require('knex')({
	client: 'sqlite3',
	connection: {
		filename: __dirname + '/../../db.sqlite',
	},
});

export default knex;

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
	name?: string
	email?: string
	password?: string
}

export interface Session extends WithDates, WithUuid {
	user_id?: string
}

export interface Permission extends WithDates, WithUuid {
	user_id?: string
	file_id?: string
	is_owner?: boolean
	can_read?: boolean
	can_write?: boolean
}

export interface File extends WithDates, WithUuid {
	name?: string
	content?: any
	mime_type?: string
	is_directory?: boolean
	parent_id?: string
}
// AUTO-GENERATED-TYPES
