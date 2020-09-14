
#include "lsmtest.h"

#ifdef _WIN32

#define TICKS_PER_SECOND      (10000000)
#define TICKS_PER_MICROSECOND (10)
#define TICKS_UNIX_EPOCH      (116444736000000000LL)

int win32GetTimeOfDay(
  struct timeval *tp,
  void *tzp
){
  FILETIME fileTime;
  ULONGLONG ticks;
  ULONGLONG unixTicks;

  unused_parameter(tzp);
  memset(&fileTime, 0, sizeof(FILETIME));
  GetSystemTimeAsFileTime(&fileTime);
  ticks = (ULONGLONG)fileTime.dwHighDateTime << 32;
  ticks |= (ULONGLONG)fileTime.dwLowDateTime;
  unixTicks = ticks - TICKS_UNIX_EPOCH;
  tp->tv_sec = (long)(unixTicks / TICKS_PER_SECOND);
  unixTicks -= ((ULONGLONG)tp->tv_sec * TICKS_PER_SECOND);
  tp->tv_usec = (long)(unixTicks / TICKS_PER_MICROSECOND);

  return 0;
}
#endif
