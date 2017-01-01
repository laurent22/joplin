#include "models/folder.h"

#include "database.h"
#include "uuid.h"

using namespace jop;

Folder::Folder() {

}

bool Folder::isNew() const {
	return id().isEmpty();
}

bool Folder::save() {
	bool isNew = this->isNew();

	QStringList fields;
	VariantVector values;
	if (isNew) {
		setId(uuid::createUuid());
		fields << "id";
		values << id();
	}
	fields << "title" << "synced";
	values << title() << QVariant(0);

	if (isNew) {
		QSqlQuery q = jop::db().buildSqlQuery(Database::Insert, "folders", fields, values);
		q.exec();
		return jop::db().errorCheck(q);
	} else {
		QSqlQuery q = jop::db().buildSqlQuery(Database::Update, "folders", fields, values, "id = \"" + id() + "\"");
		q.exec();
		return jop::db().errorCheck(q);
	}
}

bool Folder::dispose() {
	QSqlQuery q(jop::db().database());
	q.prepare("DELETE FROM folders WHERE id = :id");
	q.bindValue(":id", id());
	q.exec();
	return jop::db().errorCheck(q);
}

int Folder::count() {
	QSqlQuery q = jop::db().query("SELECT count(*) as row_count FROM folders");
	q.exec();
	q.next();
	return q.value(0).toInt();
}

QVector<Folder> Folder::all(const QString &orderBy) {
	QSqlQuery q = jop::db().query("SELECT " + Folder::dbFields().join(",") + " FROM folders ORDER BY " + orderBy);
	q.exec();

	QVector<Folder> output;

	while (q.next()) {
		Folder folder;
		folder.fromSqlQuery(q);
		output.push_back(folder);
	}

	return output;
}
