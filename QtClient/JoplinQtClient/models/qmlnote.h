#ifndef QMLNOTE_H
#define QMLNOTE_H

#include <stable.h>
#include "note.h"

namespace jop {

class QmlNote : public QObject {

	Q_OBJECT

public:

	QmlNote();
	QString title() const;
	QString body() const;
	void setNote(const Note& note);

signals:

	void changed();

private:

	Note note_;

};

}

#endif // QMLNOTE_H
