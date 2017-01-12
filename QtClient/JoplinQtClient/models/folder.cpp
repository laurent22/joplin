#include "models/folder.h"

#include "dispatcher.h"
#include "database.h"
#include "uuid.h"

using namespace jop;

Folder::Folder() : Item() {}

Table Folder::table() const {
	return jop::FoldersTable;
}

bool Folder::primaryKeyIsUuid() const {
	return true;
}

bool Folder::trackChanges() const {
	return true;
}

int Folder::noteCount() const {
	QSqlQuery q = jop::db().prepare(QString("SELECT count(*) AS row_count FROM %1 WHERE parent_id = :parent_id").arg(BaseModel::tableName(jop::NotesTable)));
	q.bindValue(":parent_id", id().toString());
	jop::db().execQuery(q);
	q.next();
	return q.value(0).toInt();
}

QVector<Note> Folder::notes(const QString &orderBy, int limit, int offset) const {
	QVector<Note> output;

	QSqlQuery q = jop::db().prepare(QString("SELECT %1 FROM notes WHERE parent_id = :parent_id ORDER BY %2 LIMIT %3 OFFSET %4")
	                        .arg(BaseModel::sqlTableFields(jop::NotesTable))
	                        .arg(orderBy)
	                        .arg(limit)
	                        .arg(offset));
	q.bindValue(":parent_id", id().toString());
	jop::db().execQuery(q);
	if (!jop::db().errorCheck(q)) return output;

	while (q.next()) {
		Note note;
		note.loadSqlQuery(q);
		output.push_back(note);
	}

	return output;
}

int Folder::count() {
	return BaseModel::count(jop::FoldersTable);
}

QVector<Folder> Folder::all(const QString &orderBy) {
	QSqlQuery q("SELECT " + BaseModel::tableFieldNames(jop::FoldersTable).join(",") + " FROM " + BaseModel::tableName(jop::FoldersTable) + " ORDER BY " + orderBy);
	jop::db().execQuery(q);

	QVector<Folder> output;

	while (q.next()) {
		Folder folder;
		folder.loadSqlQuery(q);
		output.push_back(folder);
	}

	return output;
}
