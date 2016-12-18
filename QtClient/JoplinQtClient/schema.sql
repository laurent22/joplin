CREATE TABLE folders (
	id INTEGER PRIMARY KEY,
	title TEXT,
	created_time INT,
	updated_time INT,
	remote_id TEXT
);

CREATE TABLE notes (
	id INTEGER PRIMARY KEY,
	title TEXT,
	body TEXT,
	parent_id INT,
	created_time INT,
	updated_time INT,
	remote_id TEXT
);

CREATE TABLE version (
	version INT
);

INSERT INTO version (version) VALUES (1);