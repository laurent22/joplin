#ifndef NOTEMODEL_H
#define NOTEMODEL_H

#include <stable.h>

#include "services/noteservice.h"
#include "models/notecollection.h"

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
	void setFolderId(const QString& v);
	void setService(NoteService& v);
	void setCollection(NoteCollection& noteCollection);

protected:

	QHash<int, QByteArray> roleNames() const;

private:

	QList<Note> notes_;
	NoteService noteService_;
	QString folderId_;
	NoteCollection collection_;

};

}

#endif // NOTEMODEL_H
