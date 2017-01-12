#include "notecollection.h"

using namespace jop;

NoteCollection::NoteCollection() {}

NoteCollection::NoteCollection(Database& db, const QString& parentId, const QString& orderBy) {
	db_ = db;
	parentId_ = parentId;
	orderBy_ = orderBy;
}

Note NoteCollection::at(int index) const {
	return Note();
//	if (parentId_ == "") return Note();

//	if (cache_.isset(index)) return cache_.get(index);

//	std::vector<int> indexes = cache_.availableBufferAround(index, 32);
//	if (!indexes.size()) {
//		qWarning() << "Couldn't acquire buffer"; // "Cannot happen"
//		return Note();
//	}

//	int from = indexes[0];
//	int to = indexes[indexes.size() - 1];

//	QSqlQuery q = db_.query("SELECT id, title, body FROM notes WHERE parent_id = :parent_id ORDER BY " + orderBy_ + " LIMIT " + QString::number(to - from + 1) + " OFFSET " + QString::number(from));
//	q.bindValue(":parent_id", parentId_);
//	q.exec();

//	int noteIndex = from;
//	while (q.next()) {
//		Note note;
//		note.setId(q.value(0).toString());
//		note.setTitle(q.value(1).toString());
//		note.setBody(q.value(2).toString());

//		cache_.set(noteIndex, note);

//		noteIndex++;
//	}

//	return cache_.get(index);
}

// TODO: cache result
int NoteCollection::count() const {
	return 0;
//	if (parentId_ == "") return 0;

//	QSqlQuery q = db_.query("SELECT count(*) as row_count FROM notes WHERE parent_id = :parent_id");
//	q.bindValue(":parent_id", parentId_);
//	q.exec();
//	q.next();
//	return q.value(0).toInt();
}

Note NoteCollection::byId(const QString& id) const {
	return Note();
//	std::vector<int> indexes = cache_.indexes();
//	for (size_t i = 0; i < indexes.size(); i++) {
//		Note note = cache_.get(indexes[i]);
//		if (note.id() == id) return note;
//	}

//	QSqlQuery q = db_.query("SELECT id, title, body FROM notes WHERE id = :id");
//	q.bindValue(":id", id);
//	q.exec();
//	q.next();
//	if (!q.isValid()) {
//		qWarning() << "Invalid note ID:" << id;
//		return Note();
//	}

//	// TODO: refactor creation of note from SQL query object
//	Note note;
//	note.setId(q.value(0).toString());
//	note.setTitle(q.value(1).toString());
//	note.setBody(q.value(2).toString());
	//	return note;
}

