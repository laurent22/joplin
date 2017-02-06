#include "models/folder.h"
#include "database.h"

namespace jop {

Folder::Folder() : Item() {
	table_ = jop::FoldersTable;
}

//Table Folder::table() const {
//	return jop::FoldersTable;
//}

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

std::vector<std::unique_ptr<Note>> Folder::notes(const QString &orderBy, int limit, int offset) const {
	std::vector<std::unique_ptr<Note>> output;

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
		std::unique_ptr<Note> note(new Note());
		note->loadSqlQuery(q);
		output.push_back(std::move(note));
	}

	return output;
}

std::vector<std::unique_ptr<Folder>> Folder::pathToFolders(const QString& path, bool isNotePath) {
	std::vector<std::unique_ptr<Folder>> output;
	QStringList parts = path.split('/');
	QString parentId = "";
	for (int i = 0; i < parts.size(); i++) {
		std::unique_ptr<Folder> folder(new Folder());
		bool ok = folder->loadByField(parentId, "title", parts[i]);
		qWarning() << "Folder does not exist" << parts[i];
		output.push_back(std::move(folder));
	}
	return output;
}

int Folder::noteIndexById(const QString &orderBy, const QString& id) const {
	qDebug() << "Folder::noteIndexById" << orderBy << id;

	QSqlQuery q = jop::db().prepare(QString("SELECT id, %2 FROM %1 WHERE parent_id = :parent_id ORDER BY %2")
	                        .arg(BaseModel::tableName(jop::NotesTable))
	                        .arg(orderBy));
	q.bindValue(":parent_id", idString());
	jop::db().execQuery(q);
	if (!jop::db().errorCheck(q)) return -1;

	int index = 0;
	while (q.next()) {
		QString qId = q.value(0).toString();
		QString qTitle = q.value(1).toString();
		qDebug() << "CURRENT" << qId << qTitle;
		if (qId == id) return index;
		index++;
	}

	return -1;
}

int Folder::count(const QString &parentId) {
	return BaseModel::count(jop::FoldersTable, parentId);
}

std::vector<std::unique_ptr<Folder>> Folder::all(const QString& parentId, const QString &orderBy) {
	QSqlQuery q = jop::db().prepare(QString("SELECT %1 FROM %2 WHERE parent_id = :parent_id ORDER BY %3")
	        .arg(BaseModel::tableFieldNames(jop::FoldersTable).join(","))
	        .arg(BaseModel::tableName(jop::FoldersTable))
	        .arg(orderBy));
	q.bindValue(":parent_id", parentId);
	jop::db().execQuery(q);

	std::vector<std::unique_ptr<Folder>> output;

	//if (!jop::db().errorCheck(q)) return output;

	while (q.next()) {
		std::unique_ptr<Folder> folder(new Folder());
		folder->loadSqlQuery(q);
		output.push_back(std::move(folder));
	}

	return output;
}

}
