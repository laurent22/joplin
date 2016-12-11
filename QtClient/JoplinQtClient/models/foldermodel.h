#ifndef FOLDERMODEL_H
#define FOLDERMODEL_H

#include <stable.h>

#include "services/folderservice.h"

namespace jop {

class FolderModel : public QAbstractListModel {

	Q_OBJECT

public:

	enum FolderRoles {
		IdRole = Qt::UserRole + 1,
		TitleRole,
		RawRole
	};

	FolderModel();

	void setService(FolderService& folderService);

	void addFolder(Folder* folder);

	int rowCount(const QModelIndex & parent = QModelIndex()) const;

	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;

protected:

	QHash<int, QByteArray> roleNames() const;
	bool canFetchMore(const QModelIndex &parent) const Q_DECL_OVERRIDE;
	void fetchMore(const QModelIndex &parent) Q_DECL_OVERRIDE;

private:

	QList<Folder> folders_;
	FolderService folderService_;

};

}

#endif // FOLDERMODEL_H
