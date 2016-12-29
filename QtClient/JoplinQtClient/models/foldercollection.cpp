#include "foldercollection.h"
#include "databaseutils.h"

using namespace jop;

//FolderCollection::FolderCollection() {}

// Note: although parentId is supplied, it is currently not being used.
FolderCollection::FolderCollection(Database& db, const QString& parentId, const QString& orderBy) {
	db_ = db;
	parentId_ = parentId;
	orderBy_ = orderBy;
}

Folder FolderCollection::at(int index) const {
	if (cache_.size()) return cache_[index];

	QSqlQuery q = db_.query("SELECT id, title FROM folders ORDER BY " + orderBy_);
	q.exec();

	while (q.next()) {
		Folder folder;
		folder.setId(q.value(0).toString());
		folder.setTitle(q.value(1).toString());

		cache_.push_back(folder);
	}


	return at(index);
}

// TODO: cache result
int FolderCollection::count() const {
	QSqlQuery q = db_.query("SELECT count(*) as row_count FROM folders");
	q.exec();
	q.next();
	return q.value(0).toInt();
}

Folder FolderCollection::byId(const QString& id) const {
	int count = this->count();
	for (int i = 0; i < count; i++) {
		Folder folder = at(i);
		if (folder.id() == id) return folder;
	}

	qWarning() << "Invalid folder ID:" << id;
	return Folder();
}

void FolderCollection::update(const QString &id, const QStringList &fields, const VariantVector &values) {
	QSqlQuery q = dbUtils::buildSqlQuery(&db_.database(), "update", "folders", fields, values, "id = \"" + id + "\"");
	q.exec();
	cache_.clear();
	emit changed(0, count() - 1, fields);
}
