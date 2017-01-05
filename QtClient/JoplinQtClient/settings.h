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

};

}

#endif // SETTINGS_H
