/*
** 2015 Aug 04
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This file contains test code only, it is not included in release 
** versions of FTS5. It contains the implementation of an FTS5 auxiliary
** function very similar to the FTS4 function matchinfo():
**
**     https://www.sqlite.org/fts3.html#matchinfo
**
** Known differences are that:
**
**  1) this function uses the FTS5 definition of "matchable phrase", which
**     excludes any phrases that are part of an expression sub-tree that
**     does not match the current row. This comes up for MATCH queries 
**     such as:
**
**         "a OR (b AND c)"
**
**     In FTS4, if a single row contains instances of tokens "a" and "c", 
**     but not "b", all instances of "c" are considered matches. In FTS5,
**     they are not (as the "b AND c" sub-tree does not match the current
**     row.
**
**  2) For the values returned by 'x' that apply to all rows of the table, 
**     NEAR constraints are not considered. But for the number of hits in
**     the current row, they are.
**     
** This file exports a single function that may be called to register the
** matchinfo() implementation with a database handle:
**
**   int sqlite3Fts5TestRegisterMatchinfo(sqlite3 *db);
*/


#ifdef SQLITE_ENABLE_FTS5

#include "fts5.h"
#include <assert.h>
#include <string.h>

typedef struct Fts5MatchinfoCtx Fts5MatchinfoCtx;

#ifndef SQLITE_AMALGAMATION
typedef unsigned int u32;
#endif

struct Fts5MatchinfoCtx {
  int nCol;                       /* Number of cols in FTS5 table */
  int nPhrase;                    /* Number of phrases in FTS5 query */
  char *zArg;                     /* nul-term'd copy of 2nd arg */
  int nRet;                       /* Number of elements in aRet[] */
  u32 *aRet;                      /* Array of 32-bit unsigned ints to return */
};



/*
** Return a pointer to the fts5_api pointer for database connection db.
** If an error occurs, return NULL and leave an error in the database 
** handle (accessible using sqlite3_errcode()/errmsg()).
*/
static int fts5_api_from_db(sqlite3 *db, fts5_api **ppApi){
  sqlite3_stmt *pStmt = 0;
  int rc;

  *ppApi = 0;
  rc = sqlite3_prepare(db, "SELECT fts5(?1)", -1, &pStmt, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_pointer(pStmt, 1, (void*)ppApi, "fts5_api_ptr", 0);
    (void)sqlite3_step(pStmt);
    rc = sqlite3_finalize(pStmt);
  }

  return rc;
}


/*
** Argument f should be a flag accepted by matchinfo() (a valid character
** in the string passed as the second argument). If it is not, -1 is 
** returned. Otherwise, if f is a valid matchinfo flag, the value returned
** is the number of 32-bit integers added to the output array if the
** table has nCol columns and the query nPhrase phrases.
*/
static int fts5MatchinfoFlagsize(int nCol, int nPhrase, char f){
  int ret = -1;
  switch( f ){
    case 'p': ret = 1; break;
    case 'c': ret = 1; break;
    case 'x': ret = 3 * nCol * nPhrase; break;
    case 'y': ret = nCol * nPhrase; break;
    case 'b': ret = ((nCol + 31) / 32) * nPhrase; break;
    case 'n': ret = 1; break;
    case 'a': ret = nCol; break;
    case 'l': ret = nCol; break;
    case 's': ret = nCol; break;
  }
  return ret;
}

static int fts5MatchinfoIter(
  const Fts5ExtensionApi *pApi,   /* API offered by current FTS version */
  Fts5Context *pFts,              /* First arg to pass to pApi functions */
  Fts5MatchinfoCtx *p,
  int(*x)(const Fts5ExtensionApi*,Fts5Context*,Fts5MatchinfoCtx*,char,u32*)
){
  int i;
  int n = 0;
  int rc = SQLITE_OK;
  char f;
  for(i=0; (f = p->zArg[i]); i++){
    rc = x(pApi, pFts, p, f, &p->aRet[n]);
    if( rc!=SQLITE_OK ) break;
    n += fts5MatchinfoFlagsize(p->nCol, p->nPhrase, f);
  }
  return rc;
}

static int fts5MatchinfoXCb(
  const Fts5ExtensionApi *pApi,
  Fts5Context *pFts,
  void *pUserData
){
  Fts5PhraseIter iter;
  int iCol, iOff;
  u32 *aOut = (u32*)pUserData;
  int iPrev = -1;

  for(pApi->xPhraseFirst(pFts, 0, &iter, &iCol, &iOff); 
      iCol>=0; 
      pApi->xPhraseNext(pFts, &iter, &iCol, &iOff)
  ){
    aOut[iCol*3+1]++;
    if( iCol!=iPrev ) aOut[iCol*3 + 2]++;
    iPrev = iCol;
  }

  return SQLITE_OK;
}

static int fts5MatchinfoGlobalCb(
  const Fts5ExtensionApi *pApi,
  Fts5Context *pFts,
  Fts5MatchinfoCtx *p,
  char f,
  u32 *aOut
){
  int rc = SQLITE_OK;
  switch( f ){
    case 'p':
      aOut[0] = p->nPhrase; 
      break;

    case 'c':
      aOut[0] = p->nCol; 
      break;

    case 'x': {
      int i;
      for(i=0; i<p->nPhrase && rc==SQLITE_OK; i++){
        void *pPtr = (void*)&aOut[i * p->nCol * 3];
        rc = pApi->xQueryPhrase(pFts, i, pPtr, fts5MatchinfoXCb);
      }
      break;
    }

    case 'n': {
      sqlite3_int64 nRow;
      rc = pApi->xRowCount(pFts, &nRow);
      aOut[0] = (u32)nRow;
      break;
    }

    case 'a': {
      sqlite3_int64 nRow = 0;
      rc = pApi->xRowCount(pFts, &nRow);
      if( nRow==0 ){
        memset(aOut, 0, sizeof(u32) * p->nCol);
      }else{
        int i;
        for(i=0; rc==SQLITE_OK && i<p->nCol; i++){
          sqlite3_int64 nToken;
          rc = pApi->xColumnTotalSize(pFts, i, &nToken);
          if( rc==SQLITE_OK){
            aOut[i] = (u32)((2*nToken + nRow) / (2*nRow));
          }
        }
      }
      break;
    }

  }
  return rc;
}

static int fts5MatchinfoLocalCb(
  const Fts5ExtensionApi *pApi,
  Fts5Context *pFts,
  Fts5MatchinfoCtx *p,
  char f,
  u32 *aOut
){
  int i;
  int rc = SQLITE_OK;

  switch( f ){
    case 'b': {
      int iPhrase;
      int nInt = ((p->nCol + 31) / 32) * p->nPhrase;
      for(i=0; i<nInt; i++) aOut[i] = 0;

      for(iPhrase=0; iPhrase<p->nPhrase; iPhrase++){
        Fts5PhraseIter iter;
        int iCol;
        for(pApi->xPhraseFirstColumn(pFts, iPhrase, &iter, &iCol);
            iCol>=0; 
            pApi->xPhraseNextColumn(pFts, &iter, &iCol)
        ){
          aOut[iPhrase * ((p->nCol+31)/32) + iCol/32] |= ((u32)1 << iCol%32);
        }
      }

      break;
    }

    case 'x':
    case 'y': {
      int nMul = (f=='x' ? 3 : 1);
      int iPhrase;

      for(i=0; i<(p->nCol*p->nPhrase); i++) aOut[i*nMul] = 0;

      for(iPhrase=0; iPhrase<p->nPhrase; iPhrase++){
        Fts5PhraseIter iter;
        int iOff, iCol;
        for(pApi->xPhraseFirst(pFts, iPhrase, &iter, &iCol, &iOff); 
            iOff>=0; 
            pApi->xPhraseNext(pFts, &iter, &iCol, &iOff)
        ){
          aOut[nMul * (iCol + iPhrase * p->nCol)]++;
        }
      }

      break;
    }

    case 'l': {
      for(i=0; rc==SQLITE_OK && i<p->nCol; i++){
        int nToken;
        rc = pApi->xColumnSize(pFts, i, &nToken);
        aOut[i] = (u32)nToken;
      }
      break;
    }

    case 's': {
      int nInst;

      memset(aOut, 0, sizeof(u32) * p->nCol);

      rc = pApi->xInstCount(pFts, &nInst);
      for(i=0; rc==SQLITE_OK && i<nInst; i++){
        int iPhrase, iOff, iCol = 0;
        int iNextPhrase;
        int iNextOff;
        u32 nSeq = 1;
        int j;

        rc = pApi->xInst(pFts, i, &iPhrase, &iCol, &iOff);
        iNextPhrase = iPhrase+1;
        iNextOff = iOff+pApi->xPhraseSize(pFts, 0);
        for(j=i+1; rc==SQLITE_OK && j<nInst; j++){
          int ip, ic, io;
          rc = pApi->xInst(pFts, j, &ip, &ic, &io);
          if( ic!=iCol || io>iNextOff ) break;
          if( ip==iNextPhrase && io==iNextOff ){
            nSeq++;
            iNextPhrase = ip+1;
            iNextOff = io + pApi->xPhraseSize(pFts, ip);
          }
        }

        if( nSeq>aOut[iCol] ) aOut[iCol] = nSeq;
      }

      break;
    }
  }
  return rc;
}
 
static Fts5MatchinfoCtx *fts5MatchinfoNew(
  const Fts5ExtensionApi *pApi,   /* API offered by current FTS version */
  Fts5Context *pFts,              /* First arg to pass to pApi functions */
  sqlite3_context *pCtx,          /* Context for returning error message */
  const char *zArg                /* Matchinfo flag string */
){
  Fts5MatchinfoCtx *p;
  int nCol;
  int nPhrase;
  int i;
  int nInt;
  sqlite3_int64 nByte;
  int rc;

  nCol = pApi->xColumnCount(pFts);
  nPhrase = pApi->xPhraseCount(pFts);

  nInt = 0;
  for(i=0; zArg[i]; i++){
    int n = fts5MatchinfoFlagsize(nCol, nPhrase, zArg[i]);
    if( n<0 ){
      char *zErr = sqlite3_mprintf("unrecognized matchinfo flag: %c", zArg[i]);
      sqlite3_result_error(pCtx, zErr, -1);
      sqlite3_free(zErr);
      return 0;
    }
    nInt += n;
  }

  nByte = sizeof(Fts5MatchinfoCtx)          /* The struct itself */
         + sizeof(u32) * nInt               /* The p->aRet[] array */
         + (i+1);                           /* The p->zArg string */
  p = (Fts5MatchinfoCtx*)sqlite3_malloc64(nByte);
  if( p==0 ){
    sqlite3_result_error_nomem(pCtx);
    return 0;
  }
  memset(p, 0, nByte);

  p->nCol = nCol;
  p->nPhrase = nPhrase;
  p->aRet = (u32*)&p[1];
  p->nRet = nInt;
  p->zArg = (char*)&p->aRet[nInt];
  memcpy(p->zArg, zArg, i);

  rc = fts5MatchinfoIter(pApi, pFts, p, fts5MatchinfoGlobalCb);
  if( rc!=SQLITE_OK ){
    sqlite3_result_error_code(pCtx, rc);
    sqlite3_free(p);
    p = 0;
  }

  return p;
}

static void fts5MatchinfoFunc(
  const Fts5ExtensionApi *pApi,   /* API offered by current FTS version */
  Fts5Context *pFts,              /* First arg to pass to pApi functions */
  sqlite3_context *pCtx,          /* Context for returning result/error */
  int nVal,                       /* Number of values in apVal[] array */
  sqlite3_value **apVal           /* Array of trailing arguments */
){
  const char *zArg;
  Fts5MatchinfoCtx *p;
  int rc = SQLITE_OK;

  if( nVal>0 ){
    zArg = (const char*)sqlite3_value_text(apVal[0]);
  }else{
    zArg = "pcx";
  }

  p = (Fts5MatchinfoCtx*)pApi->xGetAuxdata(pFts, 0);
  if( p==0 || sqlite3_stricmp(zArg, p->zArg) ){
    p = fts5MatchinfoNew(pApi, pFts, pCtx, zArg);
    if( p==0 ){
      rc = SQLITE_NOMEM;
    }else{
      rc = pApi->xSetAuxdata(pFts, p, sqlite3_free);
    }
  }

  if( rc==SQLITE_OK ){
    rc = fts5MatchinfoIter(pApi, pFts, p, fts5MatchinfoLocalCb);
  }
  if( rc!=SQLITE_OK ){
    sqlite3_result_error_code(pCtx, rc);
  }else{
    /* No errors has occured, so return a copy of the array of integers. */
    int nByte = p->nRet * sizeof(u32);
    sqlite3_result_blob(pCtx, (void*)p->aRet, nByte, SQLITE_TRANSIENT);
  }
}

int sqlite3Fts5TestRegisterMatchinfo(sqlite3 *db){
  int rc;                         /* Return code */
  fts5_api *pApi;                 /* FTS5 API functions */

  /* Extract the FTS5 API pointer from the database handle. The 
  ** fts5_api_from_db() function above is copied verbatim from the 
  ** FTS5 documentation. Refer there for details. */
  rc = fts5_api_from_db(db, &pApi);
  if( rc!=SQLITE_OK ) return rc;

  /* If fts5_api_from_db() returns NULL, then either FTS5 is not registered
  ** with this database handle, or an error (OOM perhaps?) has occurred.
  **
  ** Also check that the fts5_api object is version 2 or newer.  
  */ 
  if( pApi==0 || pApi->iVersion<2 ){
    return SQLITE_ERROR;
  }

  /* Register the implementation of matchinfo() */
  rc = pApi->xCreateFunction(pApi, "matchinfo", 0, fts5MatchinfoFunc, 0);

  return rc;
}

#endif /* SQLITE_ENABLE_FTS5 */
