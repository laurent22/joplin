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
	int count(int parentFolderId) const;
	Note byId(const QString& id) const;
	const QList<Note> overviewList(const QString& orderBy, int from, int to) const;

private:

	Database database_;
	mutable QList<Note> cache_;

};

}

#endif // NOTESERVICE_H
