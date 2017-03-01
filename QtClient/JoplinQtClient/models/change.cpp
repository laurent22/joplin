#include "change.h"
#include "database.h"

using namespace jop;

//Table Change::table() const {
//	return jop::ChangesTable;
//}

Change::Change() : BaseModel() {
	table_ = jop::ChangesTable;
}

std::vector<Change*> Change::all(int limit) {
	QString sql = QString("SELECT %1 FROM %2 ORDER BY id ASC LIMIT %3")
	        .arg(BaseModel::tableFieldNames(jop::ChangesTable).join(","))
	        .arg(BaseModel::tableName(jop::ChangesTable))
	        .arg(QString::number(limit));

	QSqlQuery q(sql);
	jop::db().execQuery(q);

	std::vector<Change*> output;

	while (q.next()) {
		Change* change(new Change());
		change->loadSqlQuery(q);
		output.push_back(change);
	}

	return output;
}

void Change::mergedChanges(std::vector<Change*>& changes) {
	QStringList createdItems;
	QStringList deletedItems;
	QHash<QString, Change*> itemChanges;

	for (size_t i = 0; i < changes.size(); i++) {
		Change* change = changes[i];

		QString itemId = change->value("item_id").toString();
		Change::Type type = (Change::Type)change->value("type").toInt();

		if (type == Change::Create) {
			createdItems.push_back(itemId);
		} else if (type == Change::Delete) {
			deletedItems.push_back(itemId);
		}

		if (itemChanges.contains(itemId) && type == Change::Update) {
			// Merge all the "Update" event into one.
			Change* existingChange = itemChanges[itemId];
			existingChange->addMergedField(change->value("item_field").toString());
		} else {
			itemChanges[itemId] = change;
		}
	}

	std::vector<Change*> output;

	for (QHash<QString, Change*>::iterator it = itemChanges.begin(); it != itemChanges.end(); ++it) {
		QString itemId = it.key();
		Change* change = it.value();

		if (createdItems.contains(itemId) && deletedItems.contains(itemId)) {
			// Item both created then deleted - skip
			continue;
		}

		if (deletedItems.contains(itemId)) {
			// Item was deleted at some point - just return one 'delete' event
			change->setValue("type", Change::Delete);
		} else if (createdItems.contains(itemId)) {
			// Item was created then updated - just return one 'create' event with the latest changes
			change->setValue("type", Change::Create);
		}

		output.push_back(change);
	}

	// Delete the changes that are now longer needed (have been merged)
	for (size_t i = 0; i < changes.size(); i++) {
		Change* c1 = changes[i];
		bool found = false;
		for (size_t j = 0; j < output.size(); j++) {
			Change* c2 = output[i];
			if (c1 == c2) {
				found = true;
				break;
			}
		}
		if (!found) {
			delete c1; c1 = NULL;
		}
	}

	changes = output;
}

void Change::addMergedField(const QString &name) {
	if (mergedFields_.contains(name)) return;
	mergedFields_.push_back(name);
}

QStringList Change::mergedFields() const {
	QStringList output(mergedFields_);
	QString itemField = value("item_field").toString();
	if (!mergedFields_.contains(itemField)) {
		output.push_back(itemField);
	}
	return output;
}

void Change::disposeByItemId(const QString &itemId) {
	QString sql = QString("DELETE FROM %1 WHERE item_id = :item_id").arg(BaseModel::tableName(jop::ChangesTable));
	QSqlQuery q = jop::db().prepare(sql);
	q.bindValue(":item_id", itemId);
	jop::db().execQuery(q);
}
