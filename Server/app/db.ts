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

// AUTO-GENERATED-TYPES
// Auto-generated using `npm run generate-types`
export interface User extends WithDates {
	id?: string
	name?: string
	email?: string
	password?: string
}

export interface Session extends WithDates {
	id?: string
	user_id?: string
}

export interface Permission {
	id?: string
	user_id?: string
	file_id?: string
	is_owner?: boolean
	can_read?: boolean
	can_write?: boolean
	updated_time?: number
	created_time?: number
}

export interface File {
	id?: string
	name?: string
	content?: any
	mime_type?: string
	is_directory?: boolean
	parent_id?: string
	updated_time?: number
	created_time?: number
}
// AUTO-GENERATED-TYPES
