#include "change.h"

using namespace jop;

Change::Change() {}

Table Change::table() const {
	return jop::ChangesTable;
}
