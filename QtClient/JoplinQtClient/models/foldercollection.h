#ifndef FOLDERCOLLECTION_H
#define FOLDERCOLLECTION_H

#include <stable.h>

#include "database.h"
#include "models/note.h"
#include "models/folder.h"
#include "sparsevector.hpp"
#include "simpletypes.h"

namespace jop {

class FolderCollection : public QObject {

	Q_OBJECT

public:

	//FolderCollection();
	FolderCollection(Database& db, const QString &parentId, const QString& orderBy);
	Folder at(int index) const;
	int count() const;
	Folder byId(const QString &id) const;
	int idToIndex(const QString& id) const;
	QString indexToId(int index) const;
	void update(const QString& id, QStringList fields, VariantVector values);
	void add(QStringList fields, VariantVector values);
	void remove(const QString &id);

private:

	QString parentId_;
	QString orderBy_;
	Database db_;
	mutable QVector<Folder> cache_;

signals:

	void changed(int from, int to, const QStringList& fields);

public slots:

	void dispatcher_folderCreated(const QString& id);

};

}

#endif // FOLDERCOLLECTION_H
