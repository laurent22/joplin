#include "notecollection.h"

using namespace jop;

NoteCollection::NoteCollection() {}

NoteCollection::NoteCollection(Database& db, NoteCache cache, int parentId, const QString& orderBy) {
	db_ = db;
	parentId_ = parentId;
	orderBy_ = orderBy;
	cache_ = cache;
	cacheMinIndex_ = 0;
	cacheMaxIndex_ = -1;
}


int NoteCollection::cacheMinIndex() const {
	return cacheMinIndex_;
}

int NoteCollection::cacheMaxIndex() const {
	return cacheMaxIndex_;
}

Note NoteCollection::itemAt(int index) const {
	if (!parentId_) return Note();

	qDebug() << "Note at" << index << "Min" << cacheMinIndex() << "Max" << cacheMaxIndex() << "Count" << count();

	if (index >= cacheMinIndex() && index < cacheMaxIndex()) {
		return notes_[index];
	}

	int buff = 16;

	int from = index - buff;
	int to = from + (buff - 1);

	if (notes_.size()) {
		if (from <= cacheMaxIndex()) {
			from = cacheMaxIndex() + 1;
			to = from + (buff - 1);
			cacheMaxIndex_ = to;
		} else if (to >= cacheMinIndex()) {
			to = cacheMinIndex() - 1;
			from = to - (buff - 1);
			cacheMinIndex_ = from;
		}
	} else {
		from = std::max(0, index - buff);
		to = from + (buff - 1);
	}

	if (from < 0) from = 0;
	if (to >= count()) to = count() - 1;

	qDebug() << "Loading from" << from << "to" << to;

	QSqlQuery q = db_.query("SELECT id, title FROM notes WHERE parent_id = :parent_id ORDER BY " + orderBy_ + " LIMIT " + QString::number(to - from + 1) + " OFFSET " + QString::number(from));
	q.bindValue(":parent_id", parentId_);
	q.exec();

	int noteIndex = from;
	while (q.next()) {
		Note f;
		f.setId(q.value(0).toInt());
		f.setTitle(q.value(1).toString());
		f.setIsPartial(true);

		qDebug() << "Adding" << noteIndex;
		notes_[noteIndex] = f;

		noteIndex++;
	}

	qDebug() << notes_.contains(index);
	return notes_[index];
}

// TODO: cache result
int NoteCollection::count() const {
	if (!parentId_) return 0;

	QSqlQuery q = db_.query("SELECT count(*) as row_count FROM notes WHERE parent_id = :parent_id");
	q.bindValue(":parent_id", parentId_);
	q.exec();
	q.next();
	return q.value(0).toInt();
}
