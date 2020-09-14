/*
** 2017 October 27
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
*/

#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

/*
** Stuff that is available inside the amalgamation, but which we need to
** declare ourselves if this module is compiled separately.
*/
#ifndef SQLITE_AMALGAMATION
# include <string.h>
# include <stdio.h>
# include <stdlib.h>
# include <assert.h>
typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;
#define get4byte(x) (        \
    ((u32)((x)[0])<<24) +    \
    ((u32)((x)[1])<<16) +    \
    ((u32)((x)[2])<<8) +     \
    ((u32)((x)[3]))          \
)
#endif

typedef struct CidxTable CidxTable;
typedef struct CidxCursor CidxCursor;

struct CidxTable {
  sqlite3_vtab base;              /* Base class.  Must be first */
  sqlite3 *db;
};

struct CidxCursor {
  sqlite3_vtab_cursor base;       /* Base class.  Must be first */
  sqlite3_int64 iRowid;           /* Row number of the output */
  char *zIdxName;                 /* Copy of the index_name parameter */
  char *zAfterKey;                /* Copy of the after_key parameter */
  sqlite3_stmt *pStmt;            /* SQL statement that generates the output */
};

typedef struct CidxColumn CidxColumn;
struct CidxColumn {
  char *zExpr;                    /* Text for indexed expression */
  int bDesc;                      /* True for DESC columns, otherwise false */
  int bKey;                       /* Part of index, not PK */
};

typedef struct CidxIndex CidxIndex;
struct CidxIndex {
  char *zWhere;                   /* WHERE clause, if any */
  int nCol;                       /* Elements in aCol[] array */
  CidxColumn aCol[1];             /* Array of indexed columns */
};

static void *cidxMalloc(int *pRc, int n){
  void *pRet = 0;
  assert( n!=0 );
  if( *pRc==SQLITE_OK ){
    pRet = sqlite3_malloc(n);
    if( pRet ){
      memset(pRet, 0, n);
    }else{
      *pRc = SQLITE_NOMEM;
    }
  }
  return pRet;
}

static void cidxCursorError(CidxCursor *pCsr, const char *zFmt, ...){
  va_list ap;
  va_start(ap, zFmt);
  assert( pCsr->base.pVtab->zErrMsg==0 );
  pCsr->base.pVtab->zErrMsg = sqlite3_vmprintf(zFmt, ap);
  va_end(ap);
}

/*
** Connect to the incremental_index_check virtual table.
*/
static int cidxConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  int rc = SQLITE_OK;
  CidxTable *pRet;

#define IIC_ERRMSG        0
#define IIC_CURRENT_KEY   1
#define IIC_INDEX_NAME    2
#define IIC_AFTER_KEY     3
#define IIC_SCANNER_SQL   4
  rc = sqlite3_declare_vtab(db,
      "CREATE TABLE xyz("
      " errmsg TEXT,"            /* Error message or NULL if everything is ok */
      " current_key TEXT,"       /* SQLite quote() text of key values */
      " index_name HIDDEN,"      /* IN: name of the index being scanned */
      " after_key HIDDEN,"       /* IN: Start scanning after this key */
      " scanner_sql HIDDEN"      /* debuggingn info: SQL used for scanner */
      ")"
  );
  pRet = cidxMalloc(&rc, sizeof(CidxTable));
  if( pRet ){
    pRet->db = db;
  }

  *ppVtab = (sqlite3_vtab*)pRet;
  return rc;
}

/*
** Disconnect from or destroy an incremental_index_check virtual table.
*/
static int cidxDisconnect(sqlite3_vtab *pVtab){
  CidxTable *pTab = (CidxTable*)pVtab;
  sqlite3_free(pTab);
  return SQLITE_OK;
}

/*
** idxNum and idxStr are not used.  There are only three possible plans,
** which are all distinguished by the number of parameters.
**
**   No parameters:         A degenerate plan.  The result is zero rows.
**   1 Parameter:           Scan all of the index starting with first entry
**   2 parameters:          Scan the index starting after the "after_key".    
**
** Provide successively smaller costs for each of these plans to encourage
** the query planner to select the one with the most parameters.
*/
static int cidxBestIndex(sqlite3_vtab *tab, sqlite3_index_info *pInfo){
  int iIdxName = -1;
  int iAfterKey = -1;
  int i;

  for(i=0; i<pInfo->nConstraint; i++){
    struct sqlite3_index_constraint *p = &pInfo->aConstraint[i];
    if( p->usable==0 ) continue;
    if( p->op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;

    if( p->iColumn==IIC_INDEX_NAME ){
      iIdxName = i;
    }
    if( p->iColumn==IIC_AFTER_KEY ){
      iAfterKey = i;
    }
  }

  if( iIdxName<0 ){
    pInfo->estimatedCost = 1000000000.0;
  }else{
    pInfo->aConstraintUsage[iIdxName].argvIndex = 1;
    pInfo->aConstraintUsage[iIdxName].omit = 1;
    if( iAfterKey<0 ){
      pInfo->estimatedCost = 1000000.0;
    }else{
      pInfo->aConstraintUsage[iAfterKey].argvIndex = 2;
      pInfo->aConstraintUsage[iAfterKey].omit = 1;
      pInfo->estimatedCost = 1000.0;
    }
  }

  return SQLITE_OK;
}

/*
** Open a new btreeinfo cursor.
*/
static int cidxOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  CidxCursor *pRet;
  int rc = SQLITE_OK;

  pRet = cidxMalloc(&rc, sizeof(CidxCursor));

  *ppCursor = (sqlite3_vtab_cursor*)pRet;
  return rc;
}

/*
** Close a btreeinfo cursor.
*/
static int cidxClose(sqlite3_vtab_cursor *pCursor){
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  sqlite3_finalize(pCsr->pStmt);
  sqlite3_free(pCsr->zIdxName);
  sqlite3_free(pCsr->zAfterKey);
  sqlite3_free(pCsr);
  return SQLITE_OK;
}

/*
** Move a btreeinfo cursor to the next entry in the file.
*/
static int cidxNext(sqlite3_vtab_cursor *pCursor){
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  int rc = sqlite3_step(pCsr->pStmt);
  if( rc!=SQLITE_ROW ){
    rc = sqlite3_finalize(pCsr->pStmt);
    pCsr->pStmt = 0;
    if( rc!=SQLITE_OK ){
      sqlite3 *db = ((CidxTable*)pCsr->base.pVtab)->db;
      cidxCursorError(pCsr, "Cursor error: %s", sqlite3_errmsg(db));
    }
  }else{
    pCsr->iRowid++;
    rc = SQLITE_OK;
  }
  return rc;
}

/* We have reached EOF if previous sqlite3_step() returned
** anything other than SQLITE_ROW;
*/
static int cidxEof(sqlite3_vtab_cursor *pCursor){
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  return pCsr->pStmt==0;
}

static char *cidxMprintf(int *pRc, const char *zFmt, ...){
  char *zRet = 0;
  va_list ap;
  va_start(ap, zFmt);
  zRet = sqlite3_vmprintf(zFmt, ap);
  if( *pRc==SQLITE_OK ){
    if( zRet==0 ){
      *pRc = SQLITE_NOMEM;
    }
  }else{
    sqlite3_free(zRet);
    zRet = 0;
  }
  va_end(ap);
  return zRet;
}

static sqlite3_stmt *cidxPrepare(
  int *pRc, CidxCursor *pCsr, const char *zFmt, ...
){
  sqlite3_stmt *pRet = 0;
  char *zSql;
  va_list ap;                     /* ... printf arguments */
  va_start(ap, zFmt);

  zSql = sqlite3_vmprintf(zFmt, ap);
  if( *pRc==SQLITE_OK ){
    if( zSql==0 ){
      *pRc = SQLITE_NOMEM;
    }else{
      sqlite3 *db = ((CidxTable*)pCsr->base.pVtab)->db;
      *pRc = sqlite3_prepare_v2(db, zSql, -1, &pRet, 0);
      if( *pRc!=SQLITE_OK ){
        cidxCursorError(pCsr, "SQL error: %s", sqlite3_errmsg(db));
      }
    }
  }
  sqlite3_free(zSql);
  va_end(ap);

  return pRet;
}

static void cidxFinalize(int *pRc, sqlite3_stmt *pStmt){
  int rc = sqlite3_finalize(pStmt);
  if( *pRc==SQLITE_OK ) *pRc = rc;
}

char *cidxStrdup(int *pRc, const char *zStr){
  char *zRet = 0;
  if( *pRc==SQLITE_OK ){
    int n = (int)strlen(zStr);
    zRet = cidxMalloc(pRc, n+1);
    if( zRet ) memcpy(zRet, zStr, n+1);
  }
  return zRet;
}

static void cidxFreeIndex(CidxIndex *pIdx){
  if( pIdx ){
    int i;
    for(i=0; i<pIdx->nCol; i++){
      sqlite3_free(pIdx->aCol[i].zExpr);
    }
    sqlite3_free(pIdx->zWhere);
    sqlite3_free(pIdx);
  }
}

static int cidx_isspace(char c){
  return c==' ' || c=='\t' || c=='\r' || c=='\n';
}

static int cidx_isident(char c){
  return c<0 
    || (c>='0' && c<='9') || (c>='a' && c<='z') 
    || (c>='A' && c<='Z') || c=='_';
}

#define CIDX_PARSE_EOF   0
#define CIDX_PARSE_COMMA 1      /*  "," */
#define CIDX_PARSE_OPEN  2      /*  "(" */
#define CIDX_PARSE_CLOSE 3      /*  ")" */

/*
** Argument zIn points into the start, middle or end of a CREATE INDEX
** statement. If argument pbDoNotTrim is non-NULL, then this function
** scans the input until it finds EOF, a comma (",") or an open or
** close parenthesis character. It then sets (*pzOut) to point to said
** character and returns a CIDX_PARSE_XXX constant as appropriate. The
** parser is smart enough that special characters inside SQL strings
** or comments are not returned for.
**
** Or, if argument pbDoNotTrim is NULL, then this function sets *pzOut
** to point to the first character of the string that is not whitespace
** or part of an SQL comment and returns CIDX_PARSE_EOF.
**
** Additionally, if pbDoNotTrim is not NULL and the element immediately
** before (*pzOut) is an SQL comment of the form "-- comment", then
** (*pbDoNotTrim) is set before returning. In all other cases it is
** cleared.
*/
static int cidxFindNext(
  const char *zIn, 
  const char **pzOut,
  int *pbDoNotTrim                /* OUT: True if prev is -- comment */
){
  const char *z = zIn;

  while( 1 ){
    while( cidx_isspace(*z) ) z++;
    if( z[0]=='-' && z[1]=='-' ){
      z += 2;
      while( z[0]!='\n' ){
        if( z[0]=='\0' ) return CIDX_PARSE_EOF;
        z++;
      }
      while( cidx_isspace(*z) ) z++;
      if( pbDoNotTrim ) *pbDoNotTrim = 1;
    }else
    if( z[0]=='/' && z[1]=='*' ){
      z += 2;
      while( z[0]!='*' || z[1]!='/' ){
        if( z[1]=='\0' ) return CIDX_PARSE_EOF;
        z++;
      }
      z += 2;
    }else{
      *pzOut = z;
      if( pbDoNotTrim==0 ) return CIDX_PARSE_EOF;
      switch( *z ){
        case '\0':
          return CIDX_PARSE_EOF;
        case '(':
          return CIDX_PARSE_OPEN;
        case ')':
          return CIDX_PARSE_CLOSE;
        case ',':
          return CIDX_PARSE_COMMA;
  
        case '"': 
        case '\'': 
        case '`': {
          char q = *z;
          z++;
          while( *z ){
            if( *z==q ){
              z++;
              if( *z!=q ) break;
            }
            z++;
          }
          break;
        }
  
        case '[':
          while( *z++!=']' );
          break;
  
        default:
          z++;
          break;
      }
      *pbDoNotTrim = 0;
    }
  }

  assert( 0 );
  return -1;
}

static int cidxParseSQL(CidxCursor *pCsr, CidxIndex *pIdx, const char *zSql){
  const char *z = zSql;
  const char *z1;
  int e;
  int rc = SQLITE_OK;
  int nParen = 1;
  int bDoNotTrim = 0;
  CidxColumn *pCol = pIdx->aCol;

  e = cidxFindNext(z, &z, &bDoNotTrim);
  if( e!=CIDX_PARSE_OPEN ) goto parse_error;
  z1 = z+1;
  z++;
  while( nParen>0 ){
    e = cidxFindNext(z, &z, &bDoNotTrim);
    if( e==CIDX_PARSE_EOF ) goto parse_error;
    if( (e==CIDX_PARSE_COMMA || e==CIDX_PARSE_CLOSE) && nParen==1 ){
      const char *z2 = z;
      if( pCol->zExpr ) goto parse_error;

      if( bDoNotTrim==0 ){
        while( cidx_isspace(z[-1]) ) z--;
        if( !sqlite3_strnicmp(&z[-3], "asc", 3) && 0==cidx_isident(z[-4]) ){
          z -= 3;
          while( cidx_isspace(z[-1]) ) z--;
        }else
          if( !sqlite3_strnicmp(&z[-4], "desc", 4) && 0==cidx_isident(z[-5]) ){
            z -= 4;
            while( cidx_isspace(z[-1]) ) z--;
          }
        while( cidx_isspace(z1[0]) ) z1++;
      }

      pCol->zExpr = cidxMprintf(&rc, "%.*s", z-z1, z1);
      pCol++;
      z = z1 = z2+1;
    }
    if( e==CIDX_PARSE_OPEN ) nParen++;
    if( e==CIDX_PARSE_CLOSE ) nParen--;
    z++;
  }

  /* Search for a WHERE clause */
  cidxFindNext(z, &z, 0);
  if( 0==sqlite3_strnicmp(z, "where", 5) ){
    pIdx->zWhere = cidxMprintf(&rc, "%s\n", &z[5]);
  }else if( z[0]!='\0' ){
    goto parse_error;
  }

  return rc;

 parse_error:
  cidxCursorError(pCsr, "Parse error in: %s", zSql);
  return SQLITE_ERROR;
}

static int cidxLookupIndex(
  CidxCursor *pCsr,               /* Cursor object */
  const char *zIdx,               /* Name of index to look up */
  CidxIndex **ppIdx,              /* OUT: Description of columns */
  char **pzTab                    /* OUT: Table name */
){
  int rc = SQLITE_OK;
  char *zTab = 0;
  CidxIndex *pIdx = 0;

  sqlite3_stmt *pFindTab = 0;
  sqlite3_stmt *pInfo = 0;
    
  /* Find the table for this index. */
  pFindTab = cidxPrepare(&rc, pCsr, 
      "SELECT tbl_name, sql FROM sqlite_schema WHERE name=%Q AND type='index'",
      zIdx
  );
  if( rc==SQLITE_OK && sqlite3_step(pFindTab)==SQLITE_ROW ){
    const char *zSql = (const char*)sqlite3_column_text(pFindTab, 1);
    zTab = cidxStrdup(&rc, (const char*)sqlite3_column_text(pFindTab, 0));

    pInfo = cidxPrepare(&rc, pCsr, "PRAGMA index_xinfo(%Q)", zIdx);
    if( rc==SQLITE_OK ){
      int nAlloc = 0;
      int iCol = 0;

      while( sqlite3_step(pInfo)==SQLITE_ROW ){
        const char *zName = (const char*)sqlite3_column_text(pInfo, 2);
        const char *zColl = (const char*)sqlite3_column_text(pInfo, 4);
        CidxColumn *p;
        if( zName==0 ) zName = "rowid";
        if( iCol==nAlloc ){
          int nByte = sizeof(CidxIndex) + sizeof(CidxColumn)*(nAlloc+8);
          pIdx = (CidxIndex*)sqlite3_realloc(pIdx, nByte);
          nAlloc += 8;
        }
        p = &pIdx->aCol[iCol++];
        p->bDesc = sqlite3_column_int(pInfo, 3);
        p->bKey = sqlite3_column_int(pInfo, 5);
        if( zSql==0 || p->bKey==0 ){
          p->zExpr = cidxMprintf(&rc, "\"%w\" COLLATE %s",zName,zColl);
        }else{
          p->zExpr = 0;
        }
        pIdx->nCol = iCol;
        pIdx->zWhere = 0;
      }
      cidxFinalize(&rc, pInfo);
    }

    if( rc==SQLITE_OK && zSql ){
      rc = cidxParseSQL(pCsr, pIdx, zSql);
    }
  }

  cidxFinalize(&rc, pFindTab);
  if( rc==SQLITE_OK && zTab==0 ){
    rc = SQLITE_ERROR;
  }
  
  if( rc!=SQLITE_OK ){
    sqlite3_free(zTab);
    cidxFreeIndex(pIdx);
  }else{
    *pzTab = zTab;
    *ppIdx = pIdx;
  }

  return rc;
}

static int cidxDecodeAfter(
  CidxCursor *pCsr, 
  int nCol, 
  const char *zAfterKey, 
  char ***pazAfter
){
  char **azAfter;
  int rc = SQLITE_OK;
  int nAfterKey = (int)strlen(zAfterKey);

  azAfter = cidxMalloc(&rc, sizeof(char*)*nCol + nAfterKey+1);
  if( rc==SQLITE_OK ){
    int i;
    char *zCopy = (char*)&azAfter[nCol];
    char *p = zCopy;
    memcpy(zCopy, zAfterKey, nAfterKey+1);
    for(i=0; i<nCol; i++){
      while( *p==' ' ) p++;

      /* Check NULL values */
      if( *p=='N' ){
        if( memcmp(p, "NULL", 4) ) goto parse_error;
        p += 4;
      }

      /* Check strings and blob literals */
      else if( *p=='X' || *p=='\'' ){
        azAfter[i] = p;
        if( *p=='X' ) p++;
        if( *p!='\'' ) goto parse_error;
        p++;
        while( 1 ){
          if( *p=='\0' ) goto parse_error;
          if( *p=='\'' ){
            p++;
            if( *p!='\'' ) break;
          }
          p++;
        }
      }

      /* Check numbers */
      else{
        azAfter[i] = p;
        while( (*p>='0' && *p<='9') 
            || *p=='.' || *p=='+' || *p=='-' || *p=='e' || *p=='E'
        ){
          p++;
        }
      }

      while( *p==' ' ) p++;
      if( *p!=(i==(nCol-1) ? '\0' : ',') ){
        goto parse_error;
      }
      *p++ = '\0';
    }
  }

  *pazAfter = azAfter;
  return rc;

 parse_error:
  sqlite3_free(azAfter);
  *pazAfter = 0;
  cidxCursorError(pCsr, "%s", "error parsing after value");
  return SQLITE_ERROR;
}

static char *cidxWhere(
  int *pRc, CidxColumn *aCol, char **azAfter, int iGt, int bLastIsNull
){
  char *zRet = 0;
  const char *zSep = "";
  int i;

  for(i=0; i<iGt; i++){
    zRet = cidxMprintf(pRc, "%z%s(%s) IS %s", zRet, 
        zSep, aCol[i].zExpr, (azAfter[i] ? azAfter[i] : "NULL")
    );
    zSep = " AND ";
  }

  if( bLastIsNull ){
    zRet = cidxMprintf(pRc, "%z%s(%s) IS NULL", zRet, zSep, aCol[iGt].zExpr);
  }
  else if( azAfter[iGt] ){
    zRet = cidxMprintf(pRc, "%z%s(%s) %s %s", zRet, 
        zSep, aCol[iGt].zExpr, (aCol[iGt].bDesc ? "<" : ">"), 
        azAfter[iGt]
    );
  }else{
    zRet = cidxMprintf(pRc, "%z%s(%s) IS NOT NULL", zRet, zSep,aCol[iGt].zExpr);
  }

  return zRet;
}

#define CIDX_CLIST_ALL         0
#define CIDX_CLIST_ORDERBY     1
#define CIDX_CLIST_CURRENT_KEY 2
#define CIDX_CLIST_SUBWHERE    3
#define CIDX_CLIST_SUBEXPR     4

/*
** This function returns various strings based on the contents of the
** CidxIndex structure and the eType parameter.
*/
static char *cidxColumnList(
  int *pRc,                       /* IN/OUT: Error code */
  const char *zIdx,
  CidxIndex *pIdx,                /* Indexed columns */
  int eType                       /* True to include ASC/DESC */
){
  char *zRet = 0;
  if( *pRc==SQLITE_OK ){
    const char *aDir[2] = {"", " DESC"};
    int i;
    const char *zSep = "";

    for(i=0; i<pIdx->nCol; i++){
      CidxColumn *p = &pIdx->aCol[i];
      assert( pIdx->aCol[i].bDesc==0 || pIdx->aCol[i].bDesc==1 );
      switch( eType ){

        case CIDX_CLIST_ORDERBY:
          zRet = cidxMprintf(pRc, "%z%s%d%s", zRet, zSep, i+1, aDir[p->bDesc]);
          zSep = ",";
          break;

        case CIDX_CLIST_CURRENT_KEY:
          zRet = cidxMprintf(pRc, "%z%squote(i%d)", zRet, zSep, i);
          zSep = "||','||";
          break;

        case CIDX_CLIST_SUBWHERE:
          if( p->bKey==0 ){
            zRet = cidxMprintf(pRc, "%z%s%s IS i.i%d", zRet, 
                zSep, p->zExpr, i
            );
            zSep = " AND ";
          }
          break;

        case CIDX_CLIST_SUBEXPR:
          if( p->bKey==1 ){
            zRet = cidxMprintf(pRc, "%z%s%s IS i.i%d", zRet, 
                zSep, p->zExpr, i
            );
            zSep = " AND ";
          }
          break;

        default:
          assert( eType==CIDX_CLIST_ALL );
          zRet = cidxMprintf(pRc, "%z%s(%s) AS i%d", zRet, zSep, p->zExpr, i);
          zSep = ", ";
          break;
      }
    }
  }

  return zRet;
}

/*
** Generate SQL (in memory obtained from sqlite3_malloc()) that will
** continue the index scan for zIdxName starting after zAfterKey.
*/
int cidxGenerateScanSql(
  CidxCursor *pCsr,           /* The cursor which needs the new statement */
  const char *zIdxName,       /* index to be scanned */
  const char *zAfterKey,      /* start after this key, if not NULL */
  char **pzSqlOut             /* OUT: Write the generated SQL here */
){
  int rc;
  char *zTab = 0;
  char *zCurrentKey = 0;
  char *zOrderBy = 0;
  char *zSubWhere = 0;
  char *zSubExpr = 0;
  char *zSrcList = 0;
  char **azAfter = 0;
  CidxIndex *pIdx = 0;

  *pzSqlOut = 0;
  rc = cidxLookupIndex(pCsr, zIdxName, &pIdx, &zTab);

  zOrderBy = cidxColumnList(&rc, zIdxName, pIdx, CIDX_CLIST_ORDERBY);
  zCurrentKey = cidxColumnList(&rc, zIdxName, pIdx, CIDX_CLIST_CURRENT_KEY);
  zSubWhere = cidxColumnList(&rc, zIdxName, pIdx, CIDX_CLIST_SUBWHERE);
  zSubExpr = cidxColumnList(&rc, zIdxName, pIdx, CIDX_CLIST_SUBEXPR);
  zSrcList = cidxColumnList(&rc, zIdxName, pIdx, CIDX_CLIST_ALL);

  if( rc==SQLITE_OK && zAfterKey ){
    rc = cidxDecodeAfter(pCsr, pIdx->nCol, zAfterKey, &azAfter);
  }

  if( rc==SQLITE_OK ){
    if( zAfterKey==0 ){
      *pzSqlOut = cidxMprintf(&rc,
          "SELECT (SELECT %s FROM %Q AS t WHERE %s), %s "
          "FROM (SELECT %s FROM %Q INDEXED BY %Q %s%sORDER BY %s) AS i",
          zSubExpr, zTab, zSubWhere, zCurrentKey, 
          zSrcList, zTab, zIdxName, 
          (pIdx->zWhere ? "WHERE " : ""), (pIdx->zWhere ? pIdx->zWhere : ""),
          zOrderBy
      );
    }else{
      const char *zSep = "";
      char *zSql;
      int i;
  
      zSql = cidxMprintf(&rc, 
          "SELECT (SELECT %s FROM %Q WHERE %s), %s FROM (",
          zSubExpr, zTab, zSubWhere, zCurrentKey
      );
      for(i=pIdx->nCol-1; i>=0; i--){
        int j;
        if( pIdx->aCol[i].bDesc && azAfter[i]==0 ) continue;
        for(j=0; j<2; j++){
          char *zWhere = cidxWhere(&rc, pIdx->aCol, azAfter, i, j);
          zSql = cidxMprintf(&rc, "%z"
              "%sSELECT * FROM ("
                "SELECT %s FROM %Q INDEXED BY %Q WHERE %s%s%z ORDER BY %s"
              ")",
              zSql, zSep, zSrcList, zTab, zIdxName, 
              pIdx->zWhere ? pIdx->zWhere : "",
              pIdx->zWhere ? " AND " : "",
              zWhere, zOrderBy
          );
          zSep = " UNION ALL ";
          if( pIdx->aCol[i].bDesc==0 ) break;
        }
      }
      *pzSqlOut = cidxMprintf(&rc, "%z) AS i", zSql);
    }
  }

  sqlite3_free(zTab);
  sqlite3_free(zCurrentKey);
  sqlite3_free(zOrderBy);
  sqlite3_free(zSubWhere);
  sqlite3_free(zSubExpr);
  sqlite3_free(zSrcList);
  cidxFreeIndex(pIdx);
  sqlite3_free(azAfter);
  return rc;
}


/* 
** Position a cursor back to the beginning.
*/
static int cidxFilter(
  sqlite3_vtab_cursor *pCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  int rc = SQLITE_OK;
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  const char *zIdxName = 0;
  const char *zAfterKey = 0;

  sqlite3_free(pCsr->zIdxName);
  pCsr->zIdxName = 0;
  sqlite3_free(pCsr->zAfterKey);
  pCsr->zAfterKey = 0;
  sqlite3_finalize(pCsr->pStmt);
  pCsr->pStmt = 0;

  if( argc>0 ){
    zIdxName = (const char*)sqlite3_value_text(argv[0]);
    if( argc>1 ){
      zAfterKey = (const char*)sqlite3_value_text(argv[1]);
    }
  }

  if( zIdxName ){
    char *zSql = 0;
    pCsr->zIdxName = sqlite3_mprintf("%s", zIdxName);
    pCsr->zAfterKey = zAfterKey ? sqlite3_mprintf("%s", zAfterKey) : 0;
    rc = cidxGenerateScanSql(pCsr, zIdxName, zAfterKey, &zSql);
    if( zSql ){
      pCsr->pStmt = cidxPrepare(&rc, pCsr, "%z", zSql);
    }
  }

  if( pCsr->pStmt ){
    assert( rc==SQLITE_OK );
    rc = cidxNext(pCursor);
  }
  pCsr->iRowid = 1;
  return rc;
}

/* 
** Return a column value.
*/
static int cidxColumn(
  sqlite3_vtab_cursor *pCursor, 
  sqlite3_context *ctx, 
  int iCol
){
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  assert( iCol>=IIC_ERRMSG && iCol<=IIC_SCANNER_SQL );
  switch( iCol ){
    case IIC_ERRMSG: {
      const char *zVal = 0;
      if( sqlite3_column_type(pCsr->pStmt, 0)==SQLITE_INTEGER ){
        if( sqlite3_column_int(pCsr->pStmt, 0)==0 ){
          zVal = "row data mismatch";
        }
      }else{
        zVal = "row missing";
      }
      sqlite3_result_text(ctx, zVal, -1, SQLITE_STATIC);
      break;
    }
    case IIC_CURRENT_KEY: {
      sqlite3_result_value(ctx, sqlite3_column_value(pCsr->pStmt, 1));
      break;
    }
    case IIC_INDEX_NAME: {
      sqlite3_result_text(ctx, pCsr->zIdxName, -1, SQLITE_TRANSIENT);
      break;
    }
    case IIC_AFTER_KEY: {
      sqlite3_result_text(ctx, pCsr->zAfterKey, -1, SQLITE_TRANSIENT);
      break;
    }
    case IIC_SCANNER_SQL: {
      char *zSql = 0;
      cidxGenerateScanSql(pCsr, pCsr->zIdxName, pCsr->zAfterKey, &zSql);
      sqlite3_result_text(ctx, zSql, -1, sqlite3_free);
      break;
    }
  }
  return SQLITE_OK;
}

/* Return the ROWID for the sqlite_btreeinfo table */
static int cidxRowid(sqlite3_vtab_cursor *pCursor, sqlite_int64 *pRowid){
  CidxCursor *pCsr = (CidxCursor*)pCursor;
  *pRowid = pCsr->iRowid;
  return SQLITE_OK;
}

/*
** Register the virtual table modules with the database handle passed
** as the only argument.
*/
static int ciInit(sqlite3 *db){
  static sqlite3_module cidx_module = {
    0,                            /* iVersion */
    0,                            /* xCreate */
    cidxConnect,                  /* xConnect */
    cidxBestIndex,                /* xBestIndex */
    cidxDisconnect,               /* xDisconnect */
    0,                            /* xDestroy */
    cidxOpen,                     /* xOpen - open a cursor */
    cidxClose,                    /* xClose - close a cursor */
    cidxFilter,                   /* xFilter - configure scan constraints */
    cidxNext,                     /* xNext - advance a cursor */
    cidxEof,                      /* xEof - check for end of scan */
    cidxColumn,                   /* xColumn - read data */
    cidxRowid,                    /* xRowid - read data */
    0,                            /* xUpdate */
    0,                            /* xBegin */
    0,                            /* xSync */
    0,                            /* xCommit */
    0,                            /* xRollback */
    0,                            /* xFindMethod */
    0,                            /* xRename */
    0,                            /* xSavepoint */
    0,                            /* xRelease */
    0,                            /* xRollbackTo */
  };
  return sqlite3_create_module(db, "incremental_index_check", &cidx_module, 0);
}

/*
** Extension load function.
*/
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_checkindex_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  return ciInit(db);
}
