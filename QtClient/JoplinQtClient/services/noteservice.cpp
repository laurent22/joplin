#include "noteservice.h"

using namespace jop;

NoteService::NoteService() {}

NoteService::NoteService(jop::Database &database) {
	database_ = database;
}

int NoteService::count(const QString &parentFolderId) const {
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

const QList<Note> NoteService::overviewList(const QString& folderId, int from, int to, const QString &orderBy) const {
	QList<Note> output;
	QSqlQuery q = database_.query("SELECT id, title FROM notes WHERE parent_id = :parent_id ORDER BY " + orderBy + " LIMIT " + QString::number(to - from) + " OFFSET " + QString::number(from));
	q.bindValue(":parent_id", folderId);
	q.exec();

	while (q.next()) {
		Note f;
		f.setId(q.value(0).toInt());
		f.setTitle(q.value(1).toString());
		f.setIsPartial(true);
		output << f;
	}

	return output;
}

std::pair<const Note &, bool> NoteService::overviewAt(const QString &folderId, int index, const QString &orderBy) const {
	QSqlQuery q = database_.query("SELECT id, title FROM notes WHERE parent_id = :parent_id ORDER BY " + orderBy + " LIMIT 1 OFFSET " + QString::number(index));
	q.bindValue(":parent_id", folderId);
	q.exec();
	q.next();
	if (!q.isValid()) return std::make_pair(Note(), false);

	Note f;
	f.setId(q.value(0).toInt());
	f.setTitle(q.value(1).toString());
	f.setIsPartial(true);

	return std::make_pair(f, true);
}
