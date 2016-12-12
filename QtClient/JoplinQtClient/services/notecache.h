#ifndef NOTECACHE_H
#define NOTECACHE_H

#include <stable.h>
#include "models/note.h"

namespace jop {

class NoteCache {

public:

	NoteCache();
	void add(QList<Note> notes);
	std::pair<Note, bool> get(int id) const;

private:

	QMap<int, Note> cache_;

};

}

#endif // NOTECACHE_H
