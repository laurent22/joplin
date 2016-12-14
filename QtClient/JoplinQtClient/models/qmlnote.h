#ifndef QMLNOTE_H
#define QMLNOTE_H

#include <stable.h>
#include "note.h"

namespace jop {

class QmlNote : public QObject {

	Q_OBJECT

	Q_PROPERTY(QString title READ title NOTIFY titleChanged)
	Q_PROPERTY(QString body READ body NOTIFY bodyChanged)

public:

	QmlNote();
	QString title() const;
	QString body() const;
	void setNote(const Note& note);

signals:

	void titleChanged();
	void bodyChanged();
	void changed();

private:

	Note note_;

};

}

#endif // QMLNOTE_H
