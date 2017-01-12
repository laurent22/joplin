#ifndef NOTEMODEL_H
#define NOTEMODEL_H

#include <stable.h>

#include "models/folder.h"
#include "sparsevector.hpp"

namespace jop {

class NoteModel : public QAbstractListModel {

	Q_OBJECT

public:

	enum NoteRoles {
		IdRole = Qt::UserRole + 1,
		TitleRole
	};

	NoteModel();
	int rowCount(const QModelIndex & parent = QModelIndex()) const;
	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;
	Note atIndex(int index) const;
	void setFolderId(const QString& v);
	Folder folder() const;

public slots:

	QString indexToId(int index) const;
	int idToIndex(const QString& id) const;

protected:

	QHash<int, QByteArray> roleNames() const;

private:

	QList<Note> notes_;
	QString folderId_;
	QString orderBy_;
	mutable SparseVector<Note> cache_;

};

}

#endif // NOTEMODEL_H
