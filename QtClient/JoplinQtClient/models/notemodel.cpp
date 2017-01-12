#include "notemodel.h"

jop::NoteModel::NoteModel() {
	folderId_ = "";
	orderBy_ = "title";
}

int jop::NoteModel::rowCount(const QModelIndex &parent) const {
	Q_UNUSED(parent);
	return folder().noteCount();
}

QVariant jop::NoteModel::data(const QModelIndex &index, int role) const {
	Note note = atIndex(index.row());

	if (role == IdRole) {
		return QVariant(note.id().toString());
	}

	return QVariant(note.value("title").toString());
}

jop::Note jop::NoteModel::atIndex(int index) const {
	if (folderId_ == "") return Note();
	if (index < 0 || index >= rowCount()) return Note();

	if (cache_.isset(index)) return cache_.get(index);

	std::vector<int> indexes = cache_.availableBufferAround(index, 32);
	if (!indexes.size()) {
		qWarning() << "Couldn't acquire buffer"; // "Cannot happen"
		return Note();
	}

	int from = indexes[0];
	int to = indexes[indexes.size() - 1];

	Folder folder = this->folder();

	QVector<Note> notes = folder.notes(orderBy_, to - from + 1, from);
	int noteIndex = from;
	for (int i = 0; i < notes.size(); i++) {
		cache_.set(noteIndex, notes[i]);
		noteIndex++;
	}

	return cache_.get(index);
}

void jop::NoteModel::setFolderId(const QString &v) {
	if (v == folderId_) return;
	beginResetModel();
	cache_.clear();
	folderId_ = v;
	endResetModel();
}

jop::Folder jop::NoteModel::folder() const {
	Folder folder;
	if (folderId_ == "") return folder;
	folder.load(folderId_);
	return folder;
}

QString jop::NoteModel::indexToId(int index) const {
	Note note = atIndex(index);
	return note.idString();
}

int jop::NoteModel::idToIndex(const QString &id) const {
	Folder f = this->folder();
	return f.noteIndexById(orderBy_, id);
}

QHash<int, QByteArray> jop::NoteModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
//	roles[TitleRole] = "title";
//	roles[UuidRole] = "uuid";
	return roles;

}
