#include "notemodel.h"

jop::NoteModel::NoteModel()
{

}

int jop::NoteModel::rowCount(const QModelIndex &parent) const {
	return collection_.count();
}

QVariant jop::NoteModel::data(const QModelIndex &index, int role) const {
	if (index.row() < 0 || index.row() >= rowCount()) return QVariant();

	Note note = collection_.itemAt(index.row());

	return QVariant(note.title());

//	int from = std::max(0, index.row() - 16);
//	int to = from + 32;
//	QList<Note> list = noteService_.overviewList(folderId_, from, to, "title ASC");



	return QVariant();
}

void jop::NoteModel::setFolderId(const QString &v) {
	folderId_ = v;
}

void jop::NoteModel::setService(jop::NoteService &v) {
	noteService_ = v;
}

void jop::NoteModel::setCollection(jop::NoteCollection &noteCollection) {
	beginResetModel();
	collection_ = noteCollection;
	endResetModel();
}

QHash<int, QByteArray> jop::NoteModel::roleNames() const {
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
//	roles[TitleRole] = "title";
//	roles[UuidRole] = "uuid";
	return roles;

}
