#include "notecache.h"

using namespace jop;

NoteCache::NoteCache() {

}

void NoteCache::add(QList<Note> notes) {
	foreach (Note note, notes) {
		//cache_[note.id()] = note;
	}
}

std::pair<Note, bool> NoteCache::get(int id) const {
	if (cache_.contains(id)) return std::make_pair(cache_[id], true);
	return std::make_pair(Note(), true);
}
