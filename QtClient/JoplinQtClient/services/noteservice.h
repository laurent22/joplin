#ifndef NOTESERVICE_H
#define NOTESERVICE_H

#include <stable.h>
#include "database.h"
#include "models/note.h"

namespace jop {

class NoteService {

public:

	NoteService();
	NoteService(Database& database);
	int count(const QString& parentFolderId) const;
	Note byId(const QString& id) const;
	const QList<Note> overviewList(const QString &folderId, int from, int to, const QString& orderBy) const;
	std::pair<const Note&, bool> overviewAt(const QString& folderId, int index, const QString& orderBy) const;

private:

	Database database_;
	mutable QList<Note> cache_;

};

}

#endif // NOTESERVICE_H
