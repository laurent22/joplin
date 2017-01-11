#ifndef SETTINGS_H
#define SETTINGS_H

#include <stable.h>
#include "database.h"

namespace jop {

class Settings : public QSettings {

	Q_OBJECT

public:

	Settings();

	static void initialize();

public slots:

	QString valueString(const QString& name, const QString& defaultValue = "");
	int valueInt(const QString& name, int defaultValue = 0);

};

}

#endif // SETTINGS_H
