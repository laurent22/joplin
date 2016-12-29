#include "folderservice.h"
#include "uuid.h"

using namespace jop;

FolderService::FolderService() {}

FolderService::FolderService(Database &database) {
	database_ = database;
}

int FolderService::count() const {
	QSqlQuery q = database_.query("SELECT count(*) as row_count FROM folders");
	q.exec();
	q.next();
	return q.value(0).toInt();
}

Folder FolderService::byId(const QString& id) const {
	QSqlQuery q = database_.query("SELECT title, created_time FROM folders WHERE id = :id");
	q.bindValue(":id", id);
	q.exec();
	q.next();

	Folder output;
	output.setId(id);
	output.setTitle(q.value(0).toString());
	output.setCreatedTime(q.value(1).toInt());
	return output;
}

const QList<Folder> FolderService::overviewList() const {
	if (cache_.size()) return cache_;

	QList<Folder> output;
	QSqlQuery q = database_.query("SELECT id, title FROM folders ORDER BY created_time DESC");
	q.exec();
	while (q.next()) {
		Folder f;
		f.setId(q.value(0).toString());
		f.setTitle(q.value(1).toString());
		f.setIsPartial(true);
		output << f;
	}

	cache_ = output;

	return cache_;
}

void FolderService::clearCache() {
	cache_.clear();
}
