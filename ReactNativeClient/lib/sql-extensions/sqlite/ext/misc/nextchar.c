/*
** 2013-02-28
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
** This file contains code to implement the next_char(A,T,F,W,C) SQL function.
**
** The next_char(A,T,F,W,C) function finds all valid "next" characters for
** string A given the vocabulary in T.F.  If the W value exists and is a
** non-empty string, then it is an SQL expression that limits the entries
** in T.F that will be considered.  If C exists and is a non-empty string,
** then it is the name of the collating sequence to use for comparison.  If
** 
** Only the first three arguments are required.  If the C parameter is 
** omitted or is NULL or is an empty string, then the default collating 
** sequence of T.F is used for comparision.  If the W parameter is omitted
** or is NULL or is an empty string, then no filtering of the output is
** done.
**
** The T.F column should be indexed using collation C or else this routine
** will be quite slow.
**
** For example, suppose an application has a dictionary like this:
**
**   CREATE TABLE dictionary(word TEXT UNIQUE);
**
** Further suppose that for user keypad entry, it is desired to disable
** (gray out) keys that are not valid as the next character.  If the
** the user has previously entered (say) 'cha' then to find all allowed
** next characters (and thereby determine when keys should not be grayed
** out) run the following query:
**
**   SELECT next_char('cha','dictionary','word');
**
** IMPLEMENTATION NOTES:
**
** The next_char function is implemented using recursive SQL that makes
** use of the table name and column name as part of a query.  If either
** the table name or column name are keywords or contain special characters,
** then they should be escaped.  For example:
**
**   SELECT next_char('cha','[dictionary]','[word]');
**
** This also means that the table name can be a subquery:
**
**   SELECT next_char('cha','(SELECT word AS w FROM dictionary)','w');
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <string.h>

/*
** A structure to hold context of the next_char() computation across
** nested function calls.
*/
typedef struct nextCharContext nextCharContext;
struct nextCharContext {
  sqlite3 *db;                      /* Database connection */
  sqlite3_stmt *pStmt;              /* Prepared statement used to query */
  const unsigned char *zPrefix;     /* Prefix to scan */
  int nPrefix;                      /* Size of zPrefix in bytes */
  int nAlloc;                       /* Space allocated to aResult */
  int nUsed;                        /* Space used in aResult */
  unsigned int *aResult;            /* Array of next characters */
  int mallocFailed;                 /* True if malloc fails */
  int otherError;                   /* True for any other failure */
};

/*
** Append a result character if the character is not already in the
** result.
*/
static void nextCharAppend(nextCharContext *p, unsigned c){
  int i;
  for(i=0; i<p->nUsed; i++){
    if( p->aResult[i]==c ) return;
  }
  if( p->nUsed+1 > p->nAlloc ){
    unsigned int *aNew;
    int n = p->nAlloc*2 + 30;
    aNew = sqlite3_realloc64(p->aResult, n*sizeof(unsigned int));
    if( aNew==0 ){
      p->mallocFailed = 1;
      return;
    }else{
      p->aResult = aNew;
      p->nAlloc = n;
    }
  }
  p->aResult[p->nUsed++] = c;
}

/*
** Write a character into z[] as UTF8.  Return the number of bytes needed
** to hold the character
*/
static int writeUtf8(unsigned char *z, unsigned c){
  if( c<0x00080 ){
    z[0] = (unsigned char)(c&0xff);
    return 1;
  }
  if( c<0x00800 ){
    z[0] = 0xC0 + (unsigned char)((c>>6)&0x1F);
    z[1] = 0x80 + (unsigned char)(c & 0x3F);
    return 2;
  }
  if( c<0x10000 ){
    z[0] = 0xE0 + (unsigned char)((c>>12)&0x0F);
    z[1] = 0x80 + (unsigned char)((c>>6) & 0x3F);
    z[2] = 0x80 + (unsigned char)(c & 0x3F);
    return 3;
  }
  z[0] = 0xF0 + (unsigned char)((c>>18) & 0x07);
  z[1] = 0x80 + (unsigned char)((c>>12) & 0x3F);
  z[2] = 0x80 + (unsigned char)((c>>6) & 0x3F);
  z[3] = 0x80 + (unsigned char)(c & 0x3F);
  return 4;
}

/*
** Read a UTF8 character out of z[] and write it into *pOut.  Return
** the number of bytes in z[] that were used to construct the character.
*/
static int readUtf8(const unsigned char *z, unsigned *pOut){
  static const unsigned char validBits[] = {
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x00, 0x01, 0x02, 0x03, 0x00, 0x01, 0x00, 0x00,
  };
  unsigned c = z[0];
  if( c<0xc0 ){
    *pOut = c;
    return 1;
  }else{
    int n = 1;
    c = validBits[c-0xc0];
    while( (z[n] & 0xc0)==0x80 ){
      c = (c<<6) + (0x3f & z[n++]);
    }
    if( c<0x80 || (c&0xFFFFF800)==0xD800 || (c&0xFFFFFFFE)==0xFFFE ){
      c = 0xFFFD;
    }
    *pOut = c;
    return n;
  }
}

/*
** The nextCharContext structure has been set up.  Add all "next" characters
** to the result set.
*/
static void findNextChars(nextCharContext *p){
  unsigned cPrev = 0;
  unsigned char zPrev[8];
  int n, rc;
  
  for(;;){
    sqlite3_bind_text(p->pStmt, 1, (char*)p->zPrefix, p->nPrefix,
                      SQLITE_STATIC);
    n = writeUtf8(zPrev, cPrev+1);
    sqlite3_bind_text(p->pStmt, 2, (char*)zPrev, n, SQLITE_STATIC);
    rc = sqlite3_step(p->pStmt);
    if( rc==SQLITE_DONE ){
      sqlite3_reset(p->pStmt);
      return;
    }else if( rc!=SQLITE_ROW ){
      p->otherError = rc;
      return;
    }else{
      const unsigned char *zOut = sqlite3_column_text(p->pStmt, 0);
      unsigned cNext;
      n = readUtf8(zOut+p->nPrefix, &cNext);
      sqlite3_reset(p->pStmt);
      nextCharAppend(p, cNext);
      cPrev = cNext;
      if( p->mallocFailed ) return;
    }
  }
}


/*
** next_character(A,T,F,W)
**
** Return a string composted of all next possible characters after
** A for elements of T.F.  If W is supplied, then it is an SQL expression
** that limits the elements in T.F that are considered.
*/
static void nextCharFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  nextCharContext c;
  const unsigned char *zTable = sqlite3_value_text(argv[1]);
  const unsigned char *zField = sqlite3_value_text(argv[2]);
  const unsigned char *zWhere;
  const unsigned char *zCollName;
  char *zWhereClause = 0;
  char *zColl = 0;
  char *zSql;
  int rc;

  memset(&c, 0, sizeof(c));
  c.db = sqlite3_context_db_handle(context);
  c.zPrefix = sqlite3_value_text(argv[0]);
  c.nPrefix = sqlite3_value_bytes(argv[0]);
  if( zTable==0 || zField==0 || c.zPrefix==0 ) return;
  if( argc>=4
   && (zWhere = sqlite3_value_text(argv[3]))!=0
   && zWhere[0]!=0
  ){
    zWhereClause = sqlite3_mprintf("AND (%s)", zWhere);
    if( zWhereClause==0 ){
      sqlite3_result_error_nomem(context);
      return;
    }
  }else{
    zWhereClause = "";
  }
  if( argc>=5
   && (zCollName = sqlite3_value_text(argv[4]))!=0
   && zCollName[0]!=0 
  ){
    zColl = sqlite3_mprintf("collate \"%w\"", zCollName);
    if( zColl==0 ){
      sqlite3_result_error_nomem(context);
      if( zWhereClause[0] ) sqlite3_free(zWhereClause);
      return;
    }
  }else{
    zColl = "";
  }
  zSql = sqlite3_mprintf(
    "SELECT %s FROM %s"
    " WHERE %s>=(?1 || ?2) %s"
    "   AND %s<=(?1 || char(1114111)) %s" /* 1114111 == 0x10ffff */
    "   %s"
    " ORDER BY 1 %s ASC LIMIT 1",
    zField, zTable, zField, zColl, zField, zColl, zWhereClause, zColl
  );
  if( zWhereClause[0] ) sqlite3_free(zWhereClause);
  if( zColl[0] ) sqlite3_free(zColl);
  if( zSql==0 ){
    sqlite3_result_error_nomem(context);
    return;
  }

  rc = sqlite3_prepare_v2(c.db, zSql, -1, &c.pStmt, 0);
  sqlite3_free(zSql);
  if( rc ){
    sqlite3_result_error(context, sqlite3_errmsg(c.db), -1);
    return;
  }
  findNextChars(&c);
  if( c.mallocFailed ){
    sqlite3_result_error_nomem(context);
  }else{
    unsigned char *pRes;
    pRes = sqlite3_malloc64( c.nUsed*4 + 1 );
    if( pRes==0 ){
      sqlite3_result_error_nomem(context);
    }else{
      int i;
      int n = 0;
      for(i=0; i<c.nUsed; i++){
        n += writeUtf8(pRes+n, c.aResult[i]);
      }
      pRes[n] = 0;
      sqlite3_result_text(context, (const char*)pRes, n, sqlite3_free);
    }
  }
  sqlite3_finalize(c.pStmt);
  sqlite3_free(c.aResult);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_nextchar_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "next_char", 3,
                               SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                               nextCharFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "next_char", 4,
                                 SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                                 nextCharFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "next_char", 5,
                                 SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                                 nextCharFunc, 0, 0);
  }
  return rc;
}
