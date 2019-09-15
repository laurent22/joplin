// Update with your config settings.

require('app-module-path').addPath(__dirname + '/dist');

module.exports = {



	development: {
		client: 'sqlite3',
		connection: {
			filename: './db.sqlite',
		},
		migrations: {
			directory: './dist/migrations',
		},
		useNullAsDefault: true,
	},

	staging: {
		client: 'postgresql',
		connection: {
			database: 'my_db',
			user: 'username',
			password: 'password',
		},
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			tableName: 'knex_migrations',
		},
	},

	production: {
		client: 'postgresql',
		connection: {
			database: 'my_db',
			user: 'username',
			password: 'password',
		},
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			tableName: 'knex_migrations',
		},
	},

};
