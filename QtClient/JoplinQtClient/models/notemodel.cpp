#include "notemodel.h"

namespace jop {

NoteModel::NoteModel() : QAbstractListModel() {
	folderId_ = "";
	orderBy_ = "title";
}

int NoteModel::rowCount(const QModelIndex &parent) const {
	Q_UNUSED(parent);
	return folder().noteCount();
}

QVariant NoteModel::data(const QModelIndex &index, int role) const {
	Note* note = atIndex(index.row());

	if (!note) return "";

	if (role == IdRole) {
		return QVariant(note->idString());
	}

	return QVariant(note->value("title").toString());
}

Note *NoteModel::atIndex(int index) const {
	if (folderId_ == "") return NULL;
	if (index < 0 || index >= rowCount()) return NULL;
	if (cache_.isset(index)) return cache_.get(index);

	std::vector<int> indexes = cache_.availableBufferAround(index, 32);
	if (!indexes.size()) {
		qCritical() << "Couldn't acquire buffer"; // "Cannot happen"
		return NULL;
	}

	int from = indexes[0];
	int to = indexes[indexes.size() - 1];

	Folder folder = this->folder();

	std::vector<std::unique_ptr<Note>> notes = folder.notes(orderBy_, to - from + 1, from);
	int noteIndex = from;
	for (int i = 0; i < notes.size(); i++) {
		cache_.set(noteIndex, notes[i].release());
		noteIndex++;
	}

	return cache_.get(index);
}

void NoteModel::setFolderId(const QString &v) {
	if (v == folderId_) return;
	beginResetModel();
	cache_.clear();
	folderId_ = v;
	endResetModel();
}

Folder NoteModel::folder() const {
	Folder folder;
	if (folderId_ == "") return folder;
	folder.load(folderId_);
	return folder;
}

QString NoteModel::indexToId(int index) const {
	Note* note = atIndex(index);
	return note->idString();
}

int NoteModel::idToIndex(const QString &id) const {
	Folder f = this->folder();
	return f.noteIndexById(orderBy_, id);
}

QHash<int, QByteArray> NoteModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
//	roles[TitleRole] = "title";
//	roles[UuidRole] = "uuid";
	return roles;

}

BaseModel* NoteModel::cacheGet(int index) const {
	return (BaseModel*)cache_.get(index);
}

void NoteModel::cacheSet(int index, BaseModel *baseModel) const {
	cache_.set(index, baseModel);
}

bool NoteModel::cacheIsset(int index) const {
	return cache_.isset(index);
}

void NoteModel::cacheClear() const {
	cache_.clear();
}

}
