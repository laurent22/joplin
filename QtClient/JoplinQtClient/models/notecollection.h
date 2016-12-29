#ifndef NOTECOLLECTION_H
#define NOTECOLLECTION_H

#include <stable.h>

#include "database.h"
#include "models/note.h"
#include "sparsevector.hpp"

namespace jop {

class NoteCollection {

public:

	NoteCollection();
	NoteCollection(Database& db, const QString &parentId, const QString& orderBy);
	Note at(int index) const;
	int count() const;
	Note byId(const QString &id) const;

private:

	QString parentId_;
	QString orderBy_;
	Database db_;
	mutable SparseVector<Note> cache_;

};

}

#endif // NOTECOLLECTION_H
