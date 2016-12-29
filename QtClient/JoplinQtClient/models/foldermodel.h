#ifndef FOLDERMODEL_H
#define FOLDERMODEL_H

#include <stable.h>

#include "database.h"
#include "services/folderservice.h"
#include "models/foldercollection.h"

namespace jop {

class FolderModel : public QAbstractListModel {

	Q_OBJECT

public:

	enum FolderRoles {
		IdRole = Qt::UserRole + 1,
		TitleRole,
		RawRole
	};

	FolderModel(Database& database);

	//void setService(FolderService& folderService);
	//void setCollection(FolderCollection& folderCollection);

	void addFolder(Folder* folder);

	int rowCount(const QModelIndex & parent = QModelIndex()) const;

	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;

	bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole);

protected:

	QHash<int, QByteArray> roleNames() const;

private:

	QList<Folder> folders_;
	FolderService folderService_;
	FolderCollection folderCollection_;

public slots:

	bool setData(int index, const QVariant &value, int role = Qt::EditRole);
	void folderCollection_changed(int from, int to, const QStringList &fields);
	//bool setDataInt(int index, const QVariant &value, int role = Qt::EditRole);

};

}

#endif // FOLDERMODEL_H
