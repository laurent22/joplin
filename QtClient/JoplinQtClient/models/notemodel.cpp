#include "notemodel.h"

jop::NoteModel::NoteModel()
{

}

int jop::NoteModel::rowCount(const QModelIndex &parent) const {
	Q_UNUSED(parent);
	return collection_.count();
}

QVariant jop::NoteModel::data(const QModelIndex &index, int role) const {
	if (index.row() < 0 || index.row() >= rowCount()) return QVariant();

	Note note = collection_.at(index.row());

	if (role == IdRole) {
		return QVariant(note.id());
	}

	return QVariant(note.title());
}

void jop::NoteModel::setFolderId(const QString &v) {
	folderId_ = v;
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
