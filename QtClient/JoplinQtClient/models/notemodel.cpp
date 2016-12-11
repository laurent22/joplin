#include "notemodel.h"

jop::NoteModel::NoteModel(NoteService &noteService)
{
	noteService_ = noteService;
}

int jop::NoteModel::rowCount(const QModelIndex &parent) const
{
	return 0;
}

QVariant jop::NoteModel::data(const QModelIndex &index, int role) const
{
	return QVariant();
}

QHash<int, QByteArray> jop::NoteModel::roleNames() const
{
	QHash<int, QByteArray> roles = QAbstractItemModel::roleNames();
//	roles[TitleRole] = "title";
//	roles[UuidRole] = "uuid";
	return roles;

}
