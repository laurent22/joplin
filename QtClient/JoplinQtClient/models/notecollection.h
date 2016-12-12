#ifndef NOTECOLLECTION_H
#define NOTECOLLECTION_H

#include <stable.h>

#include "database.h"
#include "models/note.h"
#include "services/notecache.h"

namespace jop {

class NoteCollection {

public:

	NoteCollection();
	NoteCollection(Database& db, NoteCache cache, int parentId, const QString& orderBy);
	Note itemAt(int index) const;
	int count() const;

private:

	int parentId_;
	QString orderBy_;
	Database db_;
	NoteCache cache_;

	int cacheMinIndex() const;
	int cacheMaxIndex() const;

	mutable int cacheMinIndex_;
	mutable int cacheMaxIndex_;
	mutable QMap<int, Note> notes_;

};

}

#endif // NOTECOLLECTION_H
