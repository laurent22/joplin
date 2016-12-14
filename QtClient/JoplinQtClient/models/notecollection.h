#ifndef NOTECOLLECTION_H
#define NOTECOLLECTION_H

#include <stable.h>

#include "database.h"
#include "models/note.h"
#include "services/notecache.h"
#include "sparsevector.hpp"

namespace jop {

class NoteCollection {

public:

	NoteCollection();
	NoteCollection(Database& db, int parentId, const QString& orderBy);
	Note at(int index) const;
	int count() const;
	Note byId(int id) const;

private:

	int parentId_;
	QString orderBy_;
	Database db_;
	mutable SparseVector<Note> cache_;

};

}

#endif // NOTECOLLECTION_H
