#include "models/item.h"
#include "uuid.h"

using namespace jop;

Item::Item() {
	isPartial_ = true;
}

void Item::fromSqlQuery(const QSqlQuery &q) {
	int i_id = q.record().indexOf("id");
	int i_title = q.record().indexOf("title");
	int i_created_time = q.record().indexOf("created_time");

	id_ = jop::uuid::fromString(q.value(i_id).toString());
	title_ = q.value(i_title).toString();
	createdTime_ = q.value(i_created_time).toInt();
}

QUuid Item::id() const {
	return id_;
}

QString Item::title() const {
	return title_;
}

int Item::createdTime() const {
	return createdTime_;
}

void Item::setId(const QUuid &v) {
	id_ = v;
}

void Item::setId(const QString& v) {
	QUuid u = uuid::fromString(v);
	setId(u);
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
