CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL DEFAULT 0,
	updated_time INT NOT NULL DEFAULT 0
);

CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	parent_id TEXT NOT NULL DEFAULT "",
	title TEXT NOT NULL DEFAULT "",
	body TEXT NOT NULL DEFAULT "",
	created_time INT NOT NULL DEFAULT 0,
	updated_time INT NOT NULL DEFAULT 0,
	latitude NUMERIC NOT NULL DEFAULT 0,
	longitude NUMERIC NOT NULL DEFAULT 0,
	altitude NUMERIC NOT NULL DEFAULT 0,
	source TEXT NOT NULL DEFAULT "",
	author TEXT NOT NULL DEFAULT "",
	source_url TEXT NOT NULL DEFAULT "",
	is_todo BOOLEAN NOT NULL DEFAULT 0,
	todo_due INT NOT NULL DEFAULT "",
	todo_completed INT NOT NULL DEFAULT "",
	source_application TEXT NOT NULL DEFAULT "",
	application_data TEXT NOT NULL DEFAULT "",
	`order` INT NOT NULL DEFAULT 0
);

CREATE TABLE tags (
	id TEXT PRIMARY KEY,
	title TEXT,
	created_time INT,
	updated_time INT
);

CREATE TABLE note_tags (
	id INTEGER PRIMARY KEY,
	note_id TEXT,
	tag_id TEXT
);

CREATE TABLE resources (
	id TEXT PRIMARY KEY,
	title TEXT,
	mime TEXT,
	filename TEXT,
	created_time INT,
	updated_time INT
);

CREATE TABLE note_resources (
	id INTEGER PRIMARY KEY,
	note_id TEXT,
	resource_id TEXT
);

CREATE TABLE version (
	version INT
);

CREATE TABLE changes (
    id INTEGER PRIMARY KEY,
	`type` INT,
	item_id TEXT,
	item_type INT,
	item_field TEXT
);

CREATE TABLE settings (
    `key` TEXT PRIMARY KEY,
	`value` TEXT,
	`type` INT
);

--CREATE TABLE mimetypes (
--    id INT,
--	mime TEXT
--);

--CREATE TABLE mimetype_extensions (
--    id INTEGER PRIMARY KEY,
--	mimetype_id,
--	extension TEXT
--);

INSERT INTO version (version) VALUES (1);
