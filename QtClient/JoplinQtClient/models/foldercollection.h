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
	void update(const QString& id, const QStringList& fields, const VariantVector& values);

private:

	QString parentId_;
	QString orderBy_;
	Database db_;
	mutable QVector<Folder> cache_;

signals:

	void changed(int from, int to, const QStringList& fields);

};

}

#endif // FOLDERCOLLECTION_H
