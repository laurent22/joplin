#include "models/folder.h"

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

int Folder::count() {
	return BaseModel::count(jop::FoldersTable);
}

QVector<Folder> Folder::all(const QString &orderBy) {
	QSqlQuery q = jop::db().query("SELECT " + BaseModel::tableFieldNames(jop::FoldersTable).join(",") + " FROM folders ORDER BY " + orderBy);
	q.exec();

	QVector<Folder> output;

	while (q.next()) {
		Folder folder;
		folder.loadSqlQuery(q);
		output.push_back(folder);
	}

	return output;
}
