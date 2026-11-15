CREATE TABLE books (
	id TEXT PRIMARY KEY,
	code_hash TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL
);

CREATE TABLE recipes (
	id TEXT NOT NULL,
	book_id TEXT NOT NULL,
	data TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (book_id, id)
);

CREATE TABLE photos (
	id TEXT PRIMARY KEY,
	book_id TEXT NOT NULL,
	recipe_id TEXT NOT NULL,
	data BLOB NOT NULL
);

CREATE INDEX photos_by_recipe ON photos (book_id, recipe_id);
