#include "notemodel.h"
#include "dispatcher.h"

namespace jop {

NoteModel::NoteModel() : AbstractListModel() {
	folderId_ = "";
	orderBy_ = "title";

	connect(&dispatcher(), SIGNAL(noteCreated(QString)), this, SLOT(dispatcher_noteCreated(QString)), Qt::QueuedConnection);
	connect(&dispatcher(), SIGNAL(noteUpdated(QString)), this, SLOT(dispatcher_noteUpdated(QString)), Qt::QueuedConnection);
	connect(&dispatcher(), SIGNAL(noteDeleted(QString)), this, SLOT(dispatcher_noteDeleted(QString)), Qt::QueuedConnection);
}

const Note *NoteModel::atIndex(int index) const {
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

int NoteModel::idToIndex(const QString &id) const {
	std::vector<int> indexes = cache_.indexes();
	for (int i = 0; i < indexes.size(); i++) {
		Note* note = cache_.get(indexes[i]);
		if (note->idString() == id) return indexes[i];
	}

	Folder f = this->folder();
	return f.noteIndexById(orderBy_, id);
}

void NoteModel::addData(const QString &title) {
	Note note;
	note.setValue("title", title);
	note.setValue("parent_id", folderId_);
	if (!note.save()) return;

	lastInsertId_ = note.idString();
}

void NoteModel::deleteData(int index) {
	Note* note = (Note*)atIndex(index);
	if (!note) return;
	note->dispose();
}

int NoteModel::baseModelCount() const {
	return folder().noteCount();
}

const BaseModel *NoteModel::cacheGet(int index) const {
	return static_cast<BaseModel*>(cache_.get(index));
}

void NoteModel::cacheSet(int index, BaseModel *baseModel) const {
	cache_.set(index, static_cast<Note*>(baseModel));
}

bool NoteModel::cacheIsset(int index) const {
	return cache_.isset(index);
}

void NoteModel::cacheClear() const {
	cache_.clear();
}

void NoteModel::dispatcher_noteCreated(const QString &noteId) {
	qDebug() << "NoteModel Folder created" << noteId;

	cacheClear();

	int from = 0;
	int to = rowCount() - 1;

	QVector<int> roles;
	roles << Qt::DisplayRole;

	// Necessary to make sure a new item is added to the view, even
	// though it might not be positioned there due to sorting
	beginInsertRows(QModelIndex(), to, to);
	endInsertRows();

	emit dataChanged(this->index(from), this->index(to), roles);
}

void NoteModel::dispatcher_noteUpdated(const QString &noteId) {
	qDebug() << "NoteModel note udpated" << noteId;

	cacheClear();

	QVector<int> roles;
	roles << Qt::DisplayRole;
	emit dataChanged(this->index(0), this->index(rowCount() - 1), roles);
}

void NoteModel::dispatcher_noteDeleted(const QString &noteId) {
	qDebug() << "NoteModel note deleted" << noteId;

	int index = idToIndex(noteId);
	qDebug() << "index" << index;
	if (index < 0) return;

	cacheClear();

	beginRemoveRows(QModelIndex(), index, index);
	endRemoveRows();
}

}
