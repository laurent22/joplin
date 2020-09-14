/*
** 2012-01-30
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** Mutex functions for LSM.
*/
#include "lsmInt.h"

/*
** Allocate a new mutex.
*/
int lsmMutexNew(lsm_env *pEnv, lsm_mutex **ppNew){
  return pEnv->xMutexNew(pEnv, ppNew);
}

/*
** Return a handle for one of the static mutexes.
*/
int lsmMutexStatic(lsm_env *pEnv, int iMutex, lsm_mutex **ppStatic){
  return pEnv->xMutexStatic(pEnv, iMutex, ppStatic);
}

/*
** Free a mutex allocated by lsmMutexNew().
*/
void lsmMutexDel(lsm_env *pEnv, lsm_mutex *pMutex){
  if( pMutex ) pEnv->xMutexDel(pMutex);
}

/*
** Enter a mutex.
*/
void lsmMutexEnter(lsm_env *pEnv, lsm_mutex *pMutex){
  pEnv->xMutexEnter(pMutex);
}

/*
** Attempt to enter a mutex, but do not block. If successful, return zero.
** Otherwise, if the mutex is already held by some other thread and is not
** entered, return non zero.
**
** Each successful call to this function must be matched by a call to
** lsmMutexLeave().
*/
int lsmMutexTry(lsm_env *pEnv, lsm_mutex *pMutex){
  return pEnv->xMutexTry(pMutex);
}

/*
** Leave a mutex.
*/
void lsmMutexLeave(lsm_env *pEnv, lsm_mutex *pMutex){
  pEnv->xMutexLeave(pMutex);
}

#ifndef NDEBUG
/*
** Return non-zero if the mutex passed as the second argument is held
** by the calling thread, or zero otherwise. If the implementation is not 
** able to tell if the mutex is held by the caller, it should return
** non-zero.
**
** This function is only used as part of assert() statements.
*/
int lsmMutexHeld(lsm_env *pEnv, lsm_mutex *pMutex){
  return pEnv->xMutexHeld ? pEnv->xMutexHeld(pMutex) : 1;
}

/*
** Return non-zero if the mutex passed as the second argument is not 
** held by the calling thread, or zero otherwise. If the implementation 
** is not able to tell if the mutex is held by the caller, it should 
** return non-zero.
**
** This function is only used as part of assert() statements.
*/
int lsmMutexNotHeld(lsm_env *pEnv, lsm_mutex *pMutex){
  return pEnv->xMutexNotHeld ? pEnv->xMutexNotHeld(pMutex) : 1;
}
#endif
