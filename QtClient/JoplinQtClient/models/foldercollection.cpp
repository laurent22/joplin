#include "foldercollection.h"
#include "databaseutils.h"
#include "dispatcher.h"
#include "uuid.h"

using namespace jop;

// Note: although parentId is supplied, it is currently not being used.
FolderCollection::FolderCollection(Database& db, const QString& parentId, const QString& orderBy) {
	db_ = db;
	parentId_ = parentId;
	orderBy_ = orderBy;

	connect(&jop::dispatcher(), SIGNAL(folderCreated(const QString&)), this, SLOT(dispatcher_folderCreated(QString)));
}

Folder FolderCollection::at(int index) const {
	if (cache_.size()) {
		if (index < 0 || index >= count()) {
			qWarning() << "Invalid folder index:" << index;
			return Folder();
		}

		return cache_[index];
	}

	QSqlQuery q = db_.query("SELECT " + Folder::dbFields().join(",") + " FROM folders ORDER BY " + orderBy_);
	q.exec();

	while (q.next()) {
		Folder folder;
		folder.fromSqlQuery(q);
		cache_.push_back(folder);
	}

	if (!cache_.size()) {
		qWarning() << "Invalid folder index:" << index;
		return Folder();
	} else {
		return at(index);
	}
}

// TODO: cache result
int FolderCollection::count() const {
	QSqlQuery q = db_.query("SELECT count(*) as row_count FROM folders");
	q.exec();
	q.next();
	return q.value(0).toInt();
}

Folder FolderCollection::byId(const QString& id) const {
	int index = idToIndex(id);
	return at(index);
}

int FolderCollection::idToIndex(const QString &id) const {
	int count = this->count();
	for (int i = 0; i < count; i++) {
		Folder folder = at(i);
		if (folder.id() == id) return i;
	}
	return -1;
}

QString FolderCollection::indexToId(int index) const {
	Folder folder = at(index);
	return folder.id();
}

void FolderCollection::update(const QString &id, QStringList fields, VariantVector values) {
	if (!fields.contains("synced")) {
		fields.push_back("synced");
		values.push_back(QVariant(0));
	}
	QSqlQuery q = db_.buildSqlQuery(Database::Update, "folders", fields, values, "id = \"" + id + "\"");
	q.exec();
	cache_.clear();
	emit changed(0, count() - 1, fields);
}

void FolderCollection::add(QStringList fields, VariantVector values) {
	fields.push_back("synced");
	values.push_back(QVariant(0));

	fields.push_back("id");
	values.push_back(uuid::createUuid());

	QSqlQuery q = db_.buildSqlQuery(Database::Insert, "folders", fields, values);
	q.exec();
	cache_.clear();
	emit changed(0, count() - 1, fields);
}

void FolderCollection::remove(const QString& id) {
	QSqlQuery q(db_.database());
	q.prepare("DELETE FROM folders WHERE id = :id");
	q.bindValue(":id", id);
	q.exec();
	cache_.clear();
	emit changed(0, count(), QStringList());
}

void FolderCollection::dispatcher_folderCreated(const QString &id) {

}
