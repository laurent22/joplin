CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	title TEXT,
	created_time INT,
	updated_time INT
);

CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	title TEXT,
	body TEXT,
	parent_id INT,
	created_time INT,
	updated_time INT,
	latitude NUMERIC,
	longitude NUMERIC,
	altitude NUMERIC,
	source TEXT,
	author TEXT,
	source_url TEXT,
	is_todo BOOLEAN,
	todo_due INT,
	todo_completed INT,
	source_application TEXT,
	application_data TEXT,
	`order` INT
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

INSERT INTO version (version) VALUES (1);
