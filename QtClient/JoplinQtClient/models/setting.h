#ifndef SETTING_H
#define SETTING_H

#include <stable.h>

#include "models/basemodel.h"

namespace jop {

class Setting : public BaseModel {

public:

	static void setSettings(const QSettings::SettingsMap &map);
	static QSettings::SettingsMap settings();

};

}

#endif // SETTING_H
