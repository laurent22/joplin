#include "models/folder.h"

#include "database.h"
#include "uuid.h"

using namespace jop;

Folder::Folder() : Item() {

}

//bool Folder::isNew() const {
//	return id().isEmpty();
//}

//bool Folder::save() {
//	bool isNew = this->isNew();

//	QStringList fields;
//	VariantVector values;
//	if (isNew) {
//		setId(uuid::createUuid());
//		fields << "id";
//		values << id();
//	}
//	fields << "title" << "synced";
//	values << title() << QVariant(0);

//	if (isNew) {
//		QSqlQuery q = jop::db().buildSqlQuery(Database::Insert, "folders", fields, values);
//		q.exec();
//		return jop::db().errorCheck(q);
//	} else {
//		QSqlQuery q = jop::db().buildSqlQuery(Database::Update, "folders", fields, values, "id = \"" + id() + "\"");
//		q.exec();
//		return jop::db().errorCheck(q);
//	}
//}

//bool Folder::dispose() {
//	return false;
////	QSqlQuery q(jop::db().database());
////	q.prepare("DELETE FROM folders WHERE id = :id");
////	q.bindValue(":id", id());
////	q.exec();
////	return jop::db().errorCheck(q);
//}

int Folder::count() {
	return BaseModel::count(jop::FoldersTable);
}

QVector<Folder> Folder::all(const QString &orderBy) {
	//QSqlQuery q = jop::db().query("SELECT " + Folder::dbFields().join(",") + " FROM folders ORDER BY " + orderBy);
	QSqlQuery q = jop::db().query("SELECT " + BaseModel::tableFieldNames(jop::FoldersTable).join(",") + " FROM folders ORDER BY " + orderBy);
	q.exec();

	QVector<Folder> output;

	while (q.next()) {
		Folder folder;
		folder.loadSqlQuery(q);
		output.push_back(folder);

//		Folder folder;
//		folder.fromSqlQuery(q);
//		output.push_back(folder);

//		Folder f2;
//		f2.loadSqlQuery(q);
//		qDebug() << "xxx" << f2.value("title").toString();
	}

	return output;
}

Table Folder::table() const {
	return jop::FoldersTable;
}

bool Folder::primaryKeyIsUuid() const {
	return true;
}
