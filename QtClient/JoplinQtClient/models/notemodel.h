#ifndef NOTEMODEL_H
#define NOTEMODEL_H

#include <stable.h>

#include "services/noteservice.h"

namespace jop {

class NoteModel : public QAbstractListModel {

	Q_OBJECT

public:

	NoteModel(NoteService &noteService);
	int rowCount(const QModelIndex & parent = QModelIndex()) const;
	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;

protected:

	QHash<int, QByteArray> roleNames() const;

private:

	QList<Note> notes_;
	NoteService noteService_;

};

}

#endif // NOTEMODEL_H
