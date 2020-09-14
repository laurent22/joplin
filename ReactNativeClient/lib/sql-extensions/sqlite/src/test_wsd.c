/*
** 2008 September 1
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
** The code in this file contains sample implementations of the 
** sqlite3_wsd_init() and sqlite3_wsd_find() functions required if the
** SQLITE_OMIT_WSD symbol is defined at build time.
*/

#if defined(SQLITE_OMIT_WSD) && defined(SQLITE_TEST)

#include "sqliteInt.h"

#define PLS_HASHSIZE 43

typedef struct ProcessLocalStorage ProcessLocalStorage;
typedef struct ProcessLocalVar ProcessLocalVar;

struct ProcessLocalStorage {
  ProcessLocalVar *aData[PLS_HASHSIZE];
  int nFree;
  u8 *pFree;
};

struct ProcessLocalVar {
  void *pKey;
  ProcessLocalVar *pNext;
};

static ProcessLocalStorage *pGlobal = 0;

int sqlite3_wsd_init(int N, int J){
  if( !pGlobal ){
    int nMalloc = N + sizeof(ProcessLocalStorage) + J*sizeof(ProcessLocalVar);
    pGlobal = (ProcessLocalStorage *)malloc(nMalloc);
    if( pGlobal ){
      memset(pGlobal, 0, sizeof(ProcessLocalStorage));
      pGlobal->nFree = nMalloc - sizeof(ProcessLocalStorage);
      pGlobal->pFree = (u8 *)&pGlobal[1];
    }
  }

  return pGlobal ? SQLITE_OK : SQLITE_NOMEM;
}

void *sqlite3_wsd_find(void *K, int L){
  int i;
  int iHash = 0;
  ProcessLocalVar *pVar;

  /* Calculate a hash of K */
  for(i=0; i<sizeof(void*); i++){
    iHash = (iHash<<3) + ((unsigned char *)&K)[i];
  }
  iHash = iHash%PLS_HASHSIZE;

  /* Search the hash table for K. */
  for(pVar=pGlobal->aData[iHash]; pVar && pVar->pKey!=K; pVar=pVar->pNext);

  /* If no entry for K was found, create and populate a new one. */
  if( !pVar ){
    int nByte = ROUND8(sizeof(ProcessLocalVar) + L);
    assert( pGlobal->nFree>=nByte );
    pVar = (ProcessLocalVar *)pGlobal->pFree;
    pVar->pKey = K;
    pVar->pNext = pGlobal->aData[iHash];
    pGlobal->aData[iHash] = pVar;
    pGlobal->nFree -= nByte;
    pGlobal->pFree += nByte;
    memcpy(&pVar[1], K, L);
  }

  return (void *)&pVar[1];
}

#endif
