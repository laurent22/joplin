/*
** 2011-08-18
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
** Helper routines for memory allocation.
*/
#include "lsmInt.h"

/*
** The following routines are called internally by LSM sub-routines. In
** this case a valid environment pointer must be supplied.
*/
void *lsmMalloc(lsm_env *pEnv, size_t N){
  assert( pEnv );
  return pEnv->xMalloc(pEnv, N);
}
void lsmFree(lsm_env *pEnv, void *p){
  assert( pEnv );
  pEnv->xFree(pEnv, p);
}
void *lsmRealloc(lsm_env *pEnv, void *p, size_t N){
  assert( pEnv );
  return pEnv->xRealloc(pEnv, p, N);
}

/*
** Core memory allocation routines for LSM.
*/
void *lsm_malloc(lsm_env *pEnv, size_t N){
  return lsmMalloc(pEnv ? pEnv : lsm_default_env(), N);
}
void lsm_free(lsm_env *pEnv, void *p){
  lsmFree(pEnv ? pEnv : lsm_default_env(), p);
}
void *lsm_realloc(lsm_env *pEnv, void *p, size_t N){
  return lsmRealloc(pEnv ? pEnv : lsm_default_env(), p, N);
}

void *lsmMallocZero(lsm_env *pEnv, size_t N){
  void *pRet;
  assert( pEnv );
  pRet = lsmMalloc(pEnv, N);
  if( pRet ) memset(pRet, 0, N);
  return pRet;
}

void *lsmMallocRc(lsm_env *pEnv, size_t N, int *pRc){
  void *pRet = 0;
  if( *pRc==LSM_OK ){
    pRet = lsmMalloc(pEnv, N);
    if( pRet==0 ){
      *pRc = LSM_NOMEM_BKPT;
    }
  }
  return pRet;
}

void *lsmMallocZeroRc(lsm_env *pEnv, size_t N, int *pRc){
  void *pRet = 0;
  if( *pRc==LSM_OK ){
    pRet = lsmMallocZero(pEnv, N);
    if( pRet==0 ){
      *pRc = LSM_NOMEM_BKPT;
    }
  }
  return pRet;
}

void *lsmReallocOrFree(lsm_env *pEnv, void *p, size_t N){
  void *pNew;
  pNew = lsm_realloc(pEnv, p, N);
  if( !pNew ) lsm_free(pEnv, p);
  return pNew;
}

void *lsmReallocOrFreeRc(lsm_env *pEnv, void *p, size_t N, int *pRc){
  void *pRet = 0;
  if( *pRc ){
    lsmFree(pEnv, p);
  }else{
    pRet = lsmReallocOrFree(pEnv, p, N);
    if( !pRet ) *pRc = LSM_NOMEM_BKPT;
  }
  return pRet;
}

char *lsmMallocStrdup(lsm_env *pEnv, const char *zIn){
  int nByte;
  char *zRet;
  nByte = strlen(zIn);
  zRet = lsmMalloc(pEnv, nByte+1);
  if( zRet ){
    memcpy(zRet, zIn, nByte+1);
  }
  return zRet;
}
