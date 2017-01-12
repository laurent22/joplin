#include "models/folder.h"
#include "database.h"

namespace jop {

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

	QSqlQuery q = jop::db().prepare(QString("SELECT %1 FROM %2 WHERE parent_id = :parent_id ORDER BY %3 LIMIT %4 OFFSET %5")
	                        .arg(BaseModel::sqlTableFields(jop::NotesTable))
	                        .arg(BaseModel::tableName(jop::NotesTable))
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

int Folder::noteIndexById(const QString &orderBy, const QString& id) const {
	QSqlQuery q = jop::db().prepare(QString("SELECT id FROM %1 WHERE parent_id = :parent_id ORDER BY %2")
	                        .arg(BaseModel::tableName(jop::NotesTable))
	                        .arg(orderBy));
	q.bindValue(":parent_id", idString());
	jop::db().execQuery(q);
	if (!jop::db().errorCheck(q)) return -1;

	int index = 0;
	while (q.next()) {
		QString qId = q.value(0).toString();
		if (qId == id) return index;
		index++;
	}

	return -1;
}

int Folder::count() {
	return BaseModel::count(jop::FoldersTable);
}

std::vector<std::unique_ptr<Folder>> Folder::all(const QString &orderBy) {
	QSqlQuery q("SELECT " + BaseModel::tableFieldNames(jop::FoldersTable).join(",") + " FROM " + BaseModel::tableName(jop::FoldersTable) + " ORDER BY " + orderBy);
	jop::db().execQuery(q);

	std::vector<std::unique_ptr<Folder>> output;

	while (q.next()) {
		std::unique_ptr<Folder> folder(new Folder());
		folder->loadSqlQuery(q);
		output.push_back(std::move(folder));
	}

	return output;
}

}
