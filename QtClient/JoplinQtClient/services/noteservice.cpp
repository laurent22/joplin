#include "noteservice.h"

using namespace jop;

NoteService::NoteService() {}

NoteService::NoteService(jop::Database &database) {
	database_ = database;
}

int NoteService::count(int parentFolderId) const {
	QSqlQuery q = database_.query("SELECT count(*) as row_count FROM notes WHERE parent_id = :parent_id");
	q.bindValue(":parent_id", parentFolderId);
	q.exec();
	q.next();
	return q.value(0).toInt();
}

Note NoteService::byId(const QString &id) const {
	Note n;
	return n;
}

const QList<Note> NoteService::overviewList(const QString &orderBy, int from, int to) const {
	return QList<Note>();
}
