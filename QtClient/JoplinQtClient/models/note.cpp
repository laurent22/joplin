#include "note.h"

using namespace jop;

Note::Note()
{

}

QString Note::body() const {
	return body_;
}

void Note::setBody(const QString &v) {
	body_ = v;
}

QStringList Note::dbFields() {
	QStringList output = Item::dbFields();
	output << "body";
	return output;
}

void Note::fromSqlQuery(const QSqlQuery &q) {
	Item::fromSqlQuery(q);
	int idx = Item::dbFields().size();
	body_ = q.value(idx).toString();
}
