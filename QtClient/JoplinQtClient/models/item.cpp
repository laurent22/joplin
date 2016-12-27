#include "models/item.h"
#include "uuid.h"

using namespace jop;

Item::Item() {
	isPartial_ = true;
	synced_ = false;
}

QString Item::id() const {
	return id_;
}

QString Item::title() const {
	return title_;
}

int Item::createdTime() const {
	return createdTime_;
}

int Item::updatedTime() const {
	return updatedTime_;
}

void Item::setId(const QString& v) {
	id_ = v;
}

void Item::setTitle(const QString &v) {
	title_ = v;
}

void Item::setCreatedTime(int v) {
	createdTime_ = v;
}

void Item::setIsPartial(bool v) {
	isPartial_ = v;
}

bool Item::isPartial() const {
	return isPartial_;
}

QStringList Item::dbFields() {
	QStringList output;
	output << "id" << "title" << "created_time" << "updated_time" << "synced";
	return output;
}

void Item::fromSqlQuery(const QSqlQuery &q) {
	id_ = q.value(0).toString();
	title_ = q.value(1).toString();
	createdTime_ = q.value(2).toInt();
	updatedTime_ = q.value(3).toInt();
	synced_ = q.value(4).toBool();
}
