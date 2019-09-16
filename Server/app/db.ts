import Knex = require("knex");

const knex:Knex = require('knex')({
	client: 'sqlite3',
	connection: {
		filename: __dirname + "/../../db.sqlite"
	}
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
// AUTO-GENERATED-TYPES