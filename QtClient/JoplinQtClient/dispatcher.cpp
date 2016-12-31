#include "dispatcher.h"

using namespace jop;

Dispatcher::Dispatcher() {

}

Dispatcher instance_;

Dispatcher& jop::dispatcher() {
	return instance_;
}

//Dispatcher &Dispatcher::instance() {
//	return instance_;
//}
