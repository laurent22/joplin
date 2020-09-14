/*
** 2015-04-06
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
** This is a utility program that computes the differences in content
** between two SQLite databases.
**
** To compile, simply link against SQLite.
**
** See the showHelp() routine below for a brief description of how to
** run the utility.
*/
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <ctype.h>
#include <string.h>
#include <assert.h>
#include "sqlite3.h"

/*
** All global variables are gathered into the "g" singleton.
*/
struct GlobalVars {
  const char *zArgv0;       /* Name of program */
  int bSchemaOnly;          /* Only show schema differences */
  int bSchemaPK;            /* Use the schema-defined PK, not the true PK */
  int bHandleVtab;          /* Handle fts3, fts4, fts5 and rtree vtabs */
  unsigned fDebug;          /* Debug flags */
  sqlite3 *db;              /* The database connection */
} g;

/*
** Allowed values for g.fDebug
*/
#define DEBUG_COLUMN_NAMES  0x000001
#define DEBUG_DIFF_SQL      0x000002

/*
** Dynamic string object
*/
typedef struct Str Str;
struct Str {
  char *z;        /* Text of the string */
  int nAlloc;     /* Bytes allocated in z[] */
  int nUsed;      /* Bytes actually used in z[] */
};

/*
** Initialize a Str object
*/
static void strInit(Str *p){
  p->z = 0;
  p->nAlloc = 0;
  p->nUsed = 0;
}
  
/*
** Print an error resulting from faulting command-line arguments and
** abort the program.
*/
static void cmdlineError(const char *zFormat, ...){
  va_list ap;
  fprintf(stderr, "%s: ", g.zArgv0);
  va_start(ap, zFormat);
  vfprintf(stderr, zFormat, ap);
  va_end(ap);
  fprintf(stderr, "\n\"%s --help\" for more help\n", g.zArgv0);
  exit(1);
}

/*
** Print an error message for an error that occurs at runtime, then
** abort the program.
*/
static void runtimeError(const char *zFormat, ...){
  va_list ap;
  fprintf(stderr, "%s: ", g.zArgv0);
  va_start(ap, zFormat);
  vfprintf(stderr, zFormat, ap);
  va_end(ap);
  fprintf(stderr, "\n");
  exit(1);
}

/*
** Free all memory held by a Str object
*/
static void strFree(Str *p){
  sqlite3_free(p->z);
  strInit(p);
}

/*
** Add formatted text to the end of a Str object
*/
static void strPrintf(Str *p, const char *zFormat, ...){
  int nNew;
  for(;;){
    if( p->z ){
      va_list ap;
      va_start(ap, zFormat);
      sqlite3_vsnprintf(p->nAlloc-p->nUsed, p->z+p->nUsed, zFormat, ap);
      va_end(ap);
      nNew = (int)strlen(p->z + p->nUsed);
    }else{
      nNew = p->nAlloc;
    }
    if( p->nUsed+nNew < p->nAlloc-1 ){
      p->nUsed += nNew;
      break;
    }
    p->nAlloc = p->nAlloc*2 + 1000;
    p->z = sqlite3_realloc(p->z, p->nAlloc);
    if( p->z==0 ) runtimeError("out of memory");
  }
}



/* Safely quote an SQL identifier.  Use the minimum amount of transformation
** necessary to allow the string to be used with %s.
**
** Space to hold the returned string is obtained from sqlite3_malloc().  The
** caller is responsible for ensuring this space is freed when no longer
** needed.
*/
static char *safeId(const char *zId){
  int i, x;
  char c;
  if( zId[0]==0 ) return sqlite3_mprintf("\"\"");
  for(i=x=0; (c = zId[i])!=0; i++){
    if( !isalpha(c) && c!='_' ){
      if( i>0 && isdigit(c) ){
        x++;
      }else{
        return sqlite3_mprintf("\"%w\"", zId);
      }
    }
  }
  if( x || !sqlite3_keyword_check(zId,i) ){
    return sqlite3_mprintf("%s", zId);
  }
  return sqlite3_mprintf("\"%w\"", zId);
}

/*
** Prepare a new SQL statement.  Print an error and abort if anything
** goes wrong.
*/
static sqlite3_stmt *db_vprepare(const char *zFormat, va_list ap){
  char *zSql;
  int rc;
  sqlite3_stmt *pStmt;

  zSql = sqlite3_vmprintf(zFormat, ap);
  if( zSql==0 ) runtimeError("out of memory");
  rc = sqlite3_prepare_v2(g.db, zSql, -1, &pStmt, 0);
  if( rc ){
    runtimeError("SQL statement error: %s\n\"%s\"", sqlite3_errmsg(g.db),
                 zSql);
  }
  sqlite3_free(zSql);
  return pStmt;
}
static sqlite3_stmt *db_prepare(const char *zFormat, ...){
  va_list ap;
  sqlite3_stmt *pStmt;
  va_start(ap, zFormat);
  pStmt = db_vprepare(zFormat, ap);
  va_end(ap);
  return pStmt;
}

/*
** Free a list of strings
*/
static void namelistFree(char **az){
  if( az ){
    int i;
    for(i=0; az[i]; i++) sqlite3_free(az[i]);
    sqlite3_free(az);
  }
}

/*
** Return a list of column names for the table zDb.zTab.  Space to
** hold the list is obtained from sqlite3_malloc() and should released
** using namelistFree() when no longer needed.
**
** Primary key columns are listed first, followed by data columns.
** The number of columns in the primary key is returned in *pnPkey.
**
** Normally, the "primary key" in the previous sentence is the true
** primary key - the rowid or INTEGER PRIMARY KEY for ordinary tables
** or the declared PRIMARY KEY for WITHOUT ROWID tables.  However, if
** the g.bSchemaPK flag is set, then the schema-defined PRIMARY KEY is
** used in all cases.  In that case, entries that have NULL values in
** any of their primary key fields will be excluded from the analysis.
**
** If the primary key for a table is the rowid but rowid is inaccessible,
** then this routine returns a NULL pointer.
**
** Examples:
**    CREATE TABLE t1(a INT UNIQUE, b INTEGER, c TEXT, PRIMARY KEY(c));
**    *pnPKey = 1;
**    az = { "rowid", "a", "b", "c", 0 }  // Normal case
**    az = { "c", "a", "b", 0 }           // g.bSchemaPK==1
**
**    CREATE TABLE t2(a INT UNIQUE, b INTEGER, c TEXT, PRIMARY KEY(b));
**    *pnPKey = 1;
**    az = { "b", "a", "c", 0 }
**
**    CREATE TABLE t3(x,y,z,PRIMARY KEY(y,z));
**    *pnPKey = 1                         // Normal case
**    az = { "rowid", "x", "y", "z", 0 }  // Normal case
**    *pnPKey = 2                         // g.bSchemaPK==1
**    az = { "y", "x", "z", 0 }           // g.bSchemaPK==1
**
**    CREATE TABLE t4(x,y,z,PRIMARY KEY(y,z)) WITHOUT ROWID;
**    *pnPKey = 2
**    az = { "y", "z", "x", 0 }
**
**    CREATE TABLE t5(rowid,_rowid_,oid);
**    az = 0     // The rowid is not accessible
*/
static char **columnNames(
  const char *zDb,                /* Database ("main" or "aux") to query */
  const char *zTab,               /* Name of table to return details of */
  int *pnPKey,                    /* OUT: Number of PK columns */
  int *pbRowid                    /* OUT: True if PK is an implicit rowid */
){
  char **az = 0;           /* List of column names to be returned */
  int naz = 0;             /* Number of entries in az[] */
  sqlite3_stmt *pStmt;     /* SQL statement being run */
  char *zPkIdxName = 0;    /* Name of the PRIMARY KEY index */
  int truePk = 0;          /* PRAGMA table_info indentifies the PK to use */
  int nPK = 0;             /* Number of PRIMARY KEY columns */
  int i, j;                /* Loop counters */

  if( g.bSchemaPK==0 ){
    /* Normal case:  Figure out what the true primary key is for the table.
    **   *  For WITHOUT ROWID tables, the true primary key is the same as
    **      the schema PRIMARY KEY, which is guaranteed to be present.
    **   *  For rowid tables with an INTEGER PRIMARY KEY, the true primary
    **      key is the INTEGER PRIMARY KEY.
    **   *  For all other rowid tables, the rowid is the true primary key.
    */
    pStmt = db_prepare("PRAGMA %s.index_list=%Q", zDb, zTab);
    while( SQLITE_ROW==sqlite3_step(pStmt) ){
      if( sqlite3_stricmp((const char*)sqlite3_column_text(pStmt,3),"pk")==0 ){
        zPkIdxName = sqlite3_mprintf("%s", sqlite3_column_text(pStmt, 1));
        break;
      }
    }
    sqlite3_finalize(pStmt);
    if( zPkIdxName ){
      int nKey = 0;
      int nCol = 0;
      truePk = 0;
      pStmt = db_prepare("PRAGMA %s.index_xinfo=%Q", zDb, zPkIdxName);
      while( SQLITE_ROW==sqlite3_step(pStmt) ){
        nCol++;
        if( sqlite3_column_int(pStmt,5) ){ nKey++; continue; }
        if( sqlite3_column_int(pStmt,1)>=0 ) truePk = 1;
      }
      if( nCol==nKey ) truePk = 1;
      if( truePk ){
        nPK = nKey;
      }else{
        nPK = 1;
      }
      sqlite3_finalize(pStmt);
      sqlite3_free(zPkIdxName);
    }else{
      truePk = 1;
      nPK = 1;
    }
    pStmt = db_prepare("PRAGMA %s.table_info=%Q", zDb, zTab);
  }else{
    /* The g.bSchemaPK==1 case:  Use whatever primary key is declared
    ** in the schema.  The "rowid" will still be used as the primary key
    ** if the table definition does not contain a PRIMARY KEY.
    */
    nPK = 0;
    pStmt = db_prepare("PRAGMA %s.table_info=%Q", zDb, zTab);
    while( SQLITE_ROW==sqlite3_step(pStmt) ){
      if( sqlite3_column_int(pStmt,5)>0 ) nPK++;
    }
    sqlite3_reset(pStmt);
    if( nPK==0 ) nPK = 1;
    truePk = 1;
  }
  *pnPKey = nPK;
  naz = nPK;
  az = sqlite3_malloc( sizeof(char*)*(nPK+1) );
  if( az==0 ) runtimeError("out of memory");
  memset(az, 0, sizeof(char*)*(nPK+1));
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    int iPKey;
    if( truePk && (iPKey = sqlite3_column_int(pStmt,5))>0 ){
      az[iPKey-1] = safeId((char*)sqlite3_column_text(pStmt,1));
    }else{
      az = sqlite3_realloc(az, sizeof(char*)*(naz+2) );
      if( az==0 ) runtimeError("out of memory");
      az[naz++] = safeId((char*)sqlite3_column_text(pStmt,1));
    }
  }
  sqlite3_finalize(pStmt);
  if( az ) az[naz] = 0;

  /* If it is non-NULL, set *pbRowid to indicate whether or not the PK of 
  ** this table is an implicit rowid (*pbRowid==1) or not (*pbRowid==0).  */
  if( pbRowid ) *pbRowid = (az[0]==0);

  /* If this table has an implicit rowid for a PK, figure out how to refer
  ** to it. There are three options - "rowid", "_rowid_" and "oid". Any
  ** of these will work, unless the table has an explicit column of the
  ** same name.  */
  if( az[0]==0 ){
    const char *azRowid[] = { "rowid", "_rowid_", "oid" };
    for(i=0; i<sizeof(azRowid)/sizeof(azRowid[0]); i++){
      for(j=1; j<naz; j++){
        if( sqlite3_stricmp(az[j], azRowid[i])==0 ) break;
      }
      if( j>=naz ){
        az[0] = sqlite3_mprintf("%s", azRowid[i]);
        break;
      }
    }
    if( az[0]==0 ){
      for(i=1; i<naz; i++) sqlite3_free(az[i]);
      sqlite3_free(az);
      az = 0;
    }
  }
  return az;
}

/*
** Print the sqlite3_value X as an SQL literal.
*/
static void printQuoted(FILE *out, sqlite3_value *X){
  switch( sqlite3_value_type(X) ){
    case SQLITE_FLOAT: {
      double r1;
      char zBuf[50];
      r1 = sqlite3_value_double(X);
      sqlite3_snprintf(sizeof(zBuf), zBuf, "%!.15g", r1);
      fprintf(out, "%s", zBuf);
      break;
    }
    case SQLITE_INTEGER: {
      fprintf(out, "%lld", sqlite3_value_int64(X));
      break;
    }
    case SQLITE_BLOB: {
      const unsigned char *zBlob = sqlite3_value_blob(X);
      int nBlob = sqlite3_value_bytes(X);
      if( zBlob ){
        int i;
        fprintf(out, "x'");
        for(i=0; i<nBlob; i++){
          fprintf(out, "%02x", zBlob[i]);
        }
        fprintf(out, "'");
      }else{
        /* Could be an OOM, could be a zero-byte blob */
        fprintf(out, "X''");
      }
      break;
    }
    case SQLITE_TEXT: {
      const unsigned char *zArg = sqlite3_value_text(X);
      int i, j;

      if( zArg==0 ){
        fprintf(out, "NULL");
      }else{
        fprintf(out, "'");
        for(i=j=0; zArg[i]; i++){
          if( zArg[i]=='\'' ){
            fprintf(out, "%.*s'", i-j+1, &zArg[j]);
            j = i+1;
          }
        }
        fprintf(out, "%s'", &zArg[j]);
      }
      break;
    }
    case SQLITE_NULL: {
      fprintf(out, "NULL");
      break;
    }
  }
}

/*
** Output SQL that will recreate the aux.zTab table.
*/
static void dump_table(const char *zTab, FILE *out){
  char *zId = safeId(zTab); /* Name of the table */
  char **az = 0;            /* List of columns */
  int nPk;                  /* Number of true primary key columns */
  int nCol;                 /* Number of data columns */
  int i;                    /* Loop counter */
  sqlite3_stmt *pStmt;      /* SQL statement */
  const char *zSep;         /* Separator string */
  Str ins;                  /* Beginning of the INSERT statement */

  pStmt = db_prepare("SELECT sql FROM aux.sqlite_schema WHERE name=%Q", zTab);
  if( SQLITE_ROW==sqlite3_step(pStmt) ){
    fprintf(out, "%s;\n", sqlite3_column_text(pStmt,0));
  }
  sqlite3_finalize(pStmt);
  if( !g.bSchemaOnly ){
    az = columnNames("aux", zTab, &nPk, 0);
    strInit(&ins);
    if( az==0 ){
      pStmt = db_prepare("SELECT * FROM aux.%s", zId);
      strPrintf(&ins,"INSERT INTO %s VALUES", zId);
    }else{
      Str sql;
      strInit(&sql);
      zSep =  "SELECT";
      for(i=0; az[i]; i++){
        strPrintf(&sql, "%s %s", zSep, az[i]);
        zSep = ",";
      }
      strPrintf(&sql," FROM aux.%s", zId);
      zSep = " ORDER BY";
      for(i=1; i<=nPk; i++){
        strPrintf(&sql, "%s %d", zSep, i);
        zSep = ",";
      }
      pStmt = db_prepare("%s", sql.z);
      strFree(&sql);
      strPrintf(&ins, "INSERT INTO %s", zId);
      zSep = "(";
      for(i=0; az[i]; i++){
        strPrintf(&ins, "%s%s", zSep, az[i]);
        zSep = ",";
      }
      strPrintf(&ins,") VALUES");
      namelistFree(az);
    }
    nCol = sqlite3_column_count(pStmt);
    while( SQLITE_ROW==sqlite3_step(pStmt) ){
      fprintf(out, "%s",ins.z);
      zSep = "(";
      for(i=0; i<nCol; i++){
        fprintf(out, "%s",zSep);
        printQuoted(out, sqlite3_column_value(pStmt,i));
        zSep = ",";
      }
      fprintf(out, ");\n");
    }
    sqlite3_finalize(pStmt);
    strFree(&ins);
  } /* endif !g.bSchemaOnly */
  pStmt = db_prepare("SELECT sql FROM aux.sqlite_schema"
                     " WHERE type='index' AND tbl_name=%Q AND sql IS NOT NULL",
                     zTab);
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    fprintf(out, "%s;\n", sqlite3_column_text(pStmt,0));
  }
  sqlite3_finalize(pStmt);
}


/*
** Compute all differences for a single table.
*/
static void diff_one_table(const char *zTab, FILE *out){
  char *zId = safeId(zTab); /* Name of table (translated for us in SQL) */
  char **az = 0;            /* Columns in main */
  char **az2 = 0;           /* Columns in aux */
  int nPk;                  /* Primary key columns in main */
  int nPk2;                 /* Primary key columns in aux */
  int n = 0;                /* Number of columns in main */
  int n2;                   /* Number of columns in aux */
  int nQ;                   /* Number of output columns in the diff query */
  int i;                    /* Loop counter */
  const char *zSep;         /* Separator string */
  Str sql;                  /* Comparison query */
  sqlite3_stmt *pStmt;      /* Query statement to do the diff */

  strInit(&sql);
  if( g.fDebug==DEBUG_COLUMN_NAMES ){
    /* Simply run columnNames() on all tables of the origin
    ** database and show the results.  This is used for testing
    ** and debugging of the columnNames() function.
    */
    az = columnNames("aux",zTab, &nPk, 0);
    if( az==0 ){
      printf("Rowid not accessible for %s\n", zId);
    }else{
      printf("%s:", zId);
      for(i=0; az[i]; i++){
        printf(" %s", az[i]);
        if( i+1==nPk ) printf(" *");
      }
      printf("\n");
    }
    goto end_diff_one_table;
  }
    

  if( sqlite3_table_column_metadata(g.db,"aux",zTab,0,0,0,0,0,0) ){
    if( !sqlite3_table_column_metadata(g.db,"main",zTab,0,0,0,0,0,0) ){
      /* Table missing from second database. */
      fprintf(out, "DROP TABLE %s;\n", zId);
    }
    goto end_diff_one_table;
  }

  if( sqlite3_table_column_metadata(g.db,"main",zTab,0,0,0,0,0,0) ){
    /* Table missing from source */
    dump_table(zTab, out);
    goto end_diff_one_table;
  }

  az = columnNames("main", zTab, &nPk, 0);
  az2 = columnNames("aux", zTab, &nPk2, 0);
  if( az && az2 ){
    for(n=0; az[n] && az2[n]; n++){
      if( sqlite3_stricmp(az[n],az2[n])!=0 ) break;
    }
  }
  if( az==0
   || az2==0
   || nPk!=nPk2
   || az[n]
  ){
    /* Schema mismatch */
    fprintf(out, "DROP TABLE %s; -- due to schema mismatch\n", zId);
    dump_table(zTab, out);
    goto end_diff_one_table;
  }

  /* Build the comparison query */
  for(n2=n; az2[n2]; n2++){
    fprintf(out, "ALTER TABLE %s ADD COLUMN %s;\n", zId, safeId(az2[n2]));
  }
  nQ = nPk2+1+2*(n2-nPk2);
  if( n2>nPk2 ){
    zSep = "SELECT ";
    for(i=0; i<nPk; i++){
      strPrintf(&sql, "%sB.%s", zSep, az[i]);
      zSep = ", ";
    }
    strPrintf(&sql, ", 1%s -- changed row\n", nPk==n ? "" : ",");
    while( az[i] ){
      strPrintf(&sql, "       A.%s IS NOT B.%s, B.%s%s\n",
                az[i], az2[i], az2[i], az2[i+1]==0 ? "" : ",");
      i++;
    }
    while( az2[i] ){
      strPrintf(&sql, "       B.%s IS NOT NULL, B.%s%s\n",
                az2[i], az2[i], az2[i+1]==0 ? "" : ",");
      i++;
    }
    strPrintf(&sql, "  FROM main.%s A, aux.%s B\n", zId, zId);
    zSep = " WHERE";
    for(i=0; i<nPk; i++){
      strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
      zSep = " AND";
    }
    zSep = "\n   AND (";
    while( az[i] ){
      strPrintf(&sql, "%sA.%s IS NOT B.%s%s\n",
                zSep, az[i], az2[i], az2[i+1]==0 ? ")" : "");
      zSep = "        OR ";
      i++;
    }
    while( az2[i] ){
      strPrintf(&sql, "%sB.%s IS NOT NULL%s\n",
                zSep, az2[i], az2[i+1]==0 ? ")" : "");
      zSep = "        OR ";
      i++;
    }
    strPrintf(&sql, " UNION ALL\n");
  }
  zSep = "SELECT ";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%sA.%s", zSep, az[i]);
    zSep = ", ";
  }
  strPrintf(&sql, ", 2%s -- deleted row\n", nPk==n ? "" : ",");
  while( az2[i] ){
    strPrintf(&sql, "       NULL, NULL%s\n", i==n2-1 ? "" : ",");
    i++;
  }
  strPrintf(&sql, "  FROM main.%s A\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM aux.%s B\n", zId);
  zSep =          "                   WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n");
  zSep = " UNION ALL\nSELECT ";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%sB.%s", zSep, az[i]);
    zSep = ", ";
  }
  strPrintf(&sql, ", 3%s -- inserted row\n", nPk==n ? "" : ",");
  while( az2[i] ){
    strPrintf(&sql, "       1, B.%s%s\n", az2[i], az2[i+1]==0 ? "" : ",");
    i++;
  }
  strPrintf(&sql, "  FROM aux.%s B\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM main.%s A\n", zId);
  zSep =          "                   WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n ORDER BY");
  zSep = " ";
  for(i=1; i<=nPk; i++){
    strPrintf(&sql, "%s%d", zSep, i);
    zSep = ", ";
  }
  strPrintf(&sql, ";\n");

  if( g.fDebug & DEBUG_DIFF_SQL ){ 
    printf("SQL for %s:\n%s\n", zId, sql.z);
    goto end_diff_one_table;
  }

  /* Drop indexes that are missing in the destination */
  pStmt = db_prepare(
    "SELECT name FROM main.sqlite_schema"
    " WHERE type='index' AND tbl_name=%Q"
    "   AND sql IS NOT NULL"
    "   AND sql NOT IN (SELECT sql FROM aux.sqlite_schema"
    "                    WHERE type='index' AND tbl_name=%Q"
    "                      AND sql IS NOT NULL)",
    zTab, zTab);
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    char *z = safeId((const char*)sqlite3_column_text(pStmt,0));
    fprintf(out, "DROP INDEX %s;\n", z);
    sqlite3_free(z);
  }
  sqlite3_finalize(pStmt);

  /* Run the query and output differences */
  if( !g.bSchemaOnly ){
    pStmt = db_prepare("%s", sql.z);
    while( SQLITE_ROW==sqlite3_step(pStmt) ){
      int iType = sqlite3_column_int(pStmt, nPk);
      if( iType==1 || iType==2 ){
        if( iType==1 ){       /* Change the content of a row */
          fprintf(out, "UPDATE %s", zId);
          zSep = " SET";
          for(i=nPk+1; i<nQ; i+=2){
            if( sqlite3_column_int(pStmt,i)==0 ) continue;
            fprintf(out, "%s %s=", zSep, az2[(i+nPk-1)/2]);
            zSep = ",";
            printQuoted(out, sqlite3_column_value(pStmt,i+1));
          }
        }else{                /* Delete a row */
          fprintf(out, "DELETE FROM %s", zId);
        }
        zSep = " WHERE";
        for(i=0; i<nPk; i++){
          fprintf(out, "%s %s=", zSep, az2[i]);
          printQuoted(out, sqlite3_column_value(pStmt,i));
          zSep = " AND";
        }
        fprintf(out, ";\n");
      }else{                  /* Insert a row */
        fprintf(out, "INSERT INTO %s(%s", zId, az2[0]);
        for(i=1; az2[i]; i++) fprintf(out, ",%s", az2[i]);
        fprintf(out, ") VALUES");
        zSep = "(";
        for(i=0; i<nPk2; i++){
          fprintf(out, "%s", zSep);
          zSep = ",";
          printQuoted(out, sqlite3_column_value(pStmt,i));
        }
        for(i=nPk2+2; i<nQ; i+=2){
          fprintf(out, ",");
          printQuoted(out, sqlite3_column_value(pStmt,i));
        }
        fprintf(out, ");\n");
      }
    }
    sqlite3_finalize(pStmt);
  } /* endif !g.bSchemaOnly */

  /* Create indexes that are missing in the source */
  pStmt = db_prepare(
    "SELECT sql FROM aux.sqlite_schema"
    " WHERE type='index' AND tbl_name=%Q"
    "   AND sql IS NOT NULL"
    "   AND sql NOT IN (SELECT sql FROM main.sqlite_schema"
    "                    WHERE type='index' AND tbl_name=%Q"
    "                      AND sql IS NOT NULL)",
    zTab, zTab);
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    fprintf(out, "%s;\n", sqlite3_column_text(pStmt,0));
  }
  sqlite3_finalize(pStmt);

end_diff_one_table:
  strFree(&sql);
  sqlite3_free(zId);
  namelistFree(az);
  namelistFree(az2);
  return;
}

/*
** Check that table zTab exists and has the same schema in both the "main"
** and "aux" databases currently opened by the global db handle. If they
** do not, output an error message on stderr and exit(1). Otherwise, if
** the schemas do match, return control to the caller.
*/
static void checkSchemasMatch(const char *zTab){
  sqlite3_stmt *pStmt = db_prepare(
      "SELECT A.sql=B.sql FROM main.sqlite_schema A, aux.sqlite_schema B"
      " WHERE A.name=%Q AND B.name=%Q", zTab, zTab
  );
  if( SQLITE_ROW==sqlite3_step(pStmt) ){
    if( sqlite3_column_int(pStmt,0)==0 ){
      runtimeError("schema changes for table %s", safeId(zTab));
    }
  }else{
    runtimeError("table %s missing from one or both databases", safeId(zTab));
  }
  sqlite3_finalize(pStmt);
}

/**************************************************************************
** The following code is copied from fossil. It is used to generate the
** fossil delta blobs sometimes used in RBU update records.
*/

typedef unsigned short u16;
typedef unsigned int u32;
typedef unsigned char u8;

/*
** The width of a hash window in bytes.  The algorithm only works if this
** is a power of 2.
*/
#define NHASH 16

/*
** The current state of the rolling hash.
**
** z[] holds the values that have been hashed.  z[] is a circular buffer.
** z[i] is the first entry and z[(i+NHASH-1)%NHASH] is the last entry of
** the window.
**
** Hash.a is the sum of all elements of hash.z[].  Hash.b is a weighted
** sum.  Hash.b is z[i]*NHASH + z[i+1]*(NHASH-1) + ... + z[i+NHASH-1]*1.
** (Each index for z[] should be module NHASH, of course.  The %NHASH operator
** is omitted in the prior expression for brevity.)
*/
typedef struct hash hash;
struct hash {
  u16 a, b;         /* Hash values */
  u16 i;            /* Start of the hash window */
  char z[NHASH];    /* The values that have been hashed */
};

/*
** Initialize the rolling hash using the first NHASH characters of z[]
*/
static void hash_init(hash *pHash, const char *z){
  u16 a, b, i;
  a = b = 0;
  for(i=0; i<NHASH; i++){
    a += z[i];
    b += (NHASH-i)*z[i];
    pHash->z[i] = z[i];
  }
  pHash->a = a & 0xffff;
  pHash->b = b & 0xffff;
  pHash->i = 0;
}

/*
** Advance the rolling hash by a single character "c"
*/
static void hash_next(hash *pHash, int c){
  u16 old = pHash->z[pHash->i];
  pHash->z[pHash->i] = (char)c;
  pHash->i = (pHash->i+1)&(NHASH-1);
  pHash->a = pHash->a - old + (char)c;
  pHash->b = pHash->b - NHASH*old + pHash->a;
}

/*
** Return a 32-bit hash value
*/
static u32 hash_32bit(hash *pHash){
  return (pHash->a & 0xffff) | (((u32)(pHash->b & 0xffff))<<16);
}

/*
** Write an base-64 integer into the given buffer.
*/
static void putInt(unsigned int v, char **pz){
  static const char zDigits[] =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~";
  /*  123456789 123456789 123456789 123456789 123456789 123456789 123 */
  int i, j;
  char zBuf[20];
  if( v==0 ){
    *(*pz)++ = '0';
    return;
  }
  for(i=0; v>0; i++, v>>=6){
    zBuf[i] = zDigits[v&0x3f];
  }
  for(j=i-1; j>=0; j--){
    *(*pz)++ = zBuf[j];
  }
}

/*
** Return the number digits in the base-64 representation of a positive integer
*/
static int digit_count(int v){
  unsigned int i, x;
  for(i=1, x=64; (unsigned int)v>=x; i++, x <<= 6){}
  return i;
}

/*
** Compute a 32-bit checksum on the N-byte buffer.  Return the result.
*/
static unsigned int checksum(const char *zIn, size_t N){
  const unsigned char *z = (const unsigned char *)zIn;
  unsigned sum0 = 0;
  unsigned sum1 = 0;
  unsigned sum2 = 0;
  unsigned sum3 = 0;
  while(N >= 16){
    sum0 += ((unsigned)z[0] + z[4] + z[8] + z[12]);
    sum1 += ((unsigned)z[1] + z[5] + z[9] + z[13]);
    sum2 += ((unsigned)z[2] + z[6] + z[10]+ z[14]);
    sum3 += ((unsigned)z[3] + z[7] + z[11]+ z[15]);
    z += 16;
    N -= 16;
  }
  while(N >= 4){
    sum0 += z[0];
    sum1 += z[1];
    sum2 += z[2];
    sum3 += z[3];
    z += 4;
    N -= 4;
  }
  sum3 += (sum2 << 8) + (sum1 << 16) + (sum0 << 24);
  switch(N){
    case 3:   sum3 += (z[2] << 8);
    case 2:   sum3 += (z[1] << 16);
    case 1:   sum3 += (z[0] << 24);
    default:  ;
  }
  return sum3;
}

/*
** Create a new delta.
**
** The delta is written into a preallocated buffer, zDelta, which
** should be at least 60 bytes longer than the target file, zOut.
** The delta string will be NUL-terminated, but it might also contain
** embedded NUL characters if either the zSrc or zOut files are
** binary.  This function returns the length of the delta string
** in bytes, excluding the final NUL terminator character.
**
** Output Format:
**
** The delta begins with a base64 number followed by a newline.  This
** number is the number of bytes in the TARGET file.  Thus, given a
** delta file z, a program can compute the size of the output file
** simply by reading the first line and decoding the base-64 number
** found there.  The delta_output_size() routine does exactly this.
**
** After the initial size number, the delta consists of a series of
** literal text segments and commands to copy from the SOURCE file.
** A copy command looks like this:
**
**     NNN@MMM,
**
** where NNN is the number of bytes to be copied and MMM is the offset
** into the source file of the first byte (both base-64).   If NNN is 0
** it means copy the rest of the input file.  Literal text is like this:
**
**     NNN:TTTTT
**
** where NNN is the number of bytes of text (base-64) and TTTTT is the text.
**
** The last term is of the form
**
**     NNN;
**
** In this case, NNN is a 32-bit bigendian checksum of the output file
** that can be used to verify that the delta applied correctly.  All
** numbers are in base-64.
**
** Pure text files generate a pure text delta.  Binary files generate a
** delta that may contain some binary data.
**
** Algorithm:
**
** The encoder first builds a hash table to help it find matching
** patterns in the source file.  16-byte chunks of the source file
** sampled at evenly spaced intervals are used to populate the hash
** table.
**
** Next we begin scanning the target file using a sliding 16-byte
** window.  The hash of the 16-byte window in the target is used to
** search for a matching section in the source file.  When a match
** is found, a copy command is added to the delta.  An effort is
** made to extend the matching section to regions that come before
** and after the 16-byte hash window.  A copy command is only issued
** if the result would use less space that just quoting the text
** literally. Literal text is added to the delta for sections that
** do not match or which can not be encoded efficiently using copy
** commands.
*/
static int rbuDeltaCreate(
  const char *zSrc,      /* The source or pattern file */
  unsigned int lenSrc,   /* Length of the source file */
  const char *zOut,      /* The target file */
  unsigned int lenOut,   /* Length of the target file */
  char *zDelta           /* Write the delta into this buffer */
){
  unsigned int i, base;
  char *zOrigDelta = zDelta;
  hash h;
  int nHash;                 /* Number of hash table entries */
  int *landmark;             /* Primary hash table */
  int *collide;              /* Collision chain */
  int lastRead = -1;         /* Last byte of zSrc read by a COPY command */

  /* Add the target file size to the beginning of the delta
  */
  putInt(lenOut, &zDelta);
  *(zDelta++) = '\n';

  /* If the source file is very small, it means that we have no
  ** chance of ever doing a copy command.  Just output a single
  ** literal segment for the entire target and exit.
  */
  if( lenSrc<=NHASH ){
    putInt(lenOut, &zDelta);
    *(zDelta++) = ':';
    memcpy(zDelta, zOut, lenOut);
    zDelta += lenOut;
    putInt(checksum(zOut, lenOut), &zDelta);
    *(zDelta++) = ';';
    return (int)(zDelta - zOrigDelta);
  }

  /* Compute the hash table used to locate matching sections in the
  ** source file.
  */
  nHash = lenSrc/NHASH;
  collide = sqlite3_malloc( nHash*2*sizeof(int) );
  landmark = &collide[nHash];
  memset(landmark, -1, nHash*sizeof(int));
  memset(collide, -1, nHash*sizeof(int));
  for(i=0; i<lenSrc-NHASH; i+=NHASH){
    int hv;
    hash_init(&h, &zSrc[i]);
    hv = hash_32bit(&h) % nHash;
    collide[i/NHASH] = landmark[hv];
    landmark[hv] = i/NHASH;
  }

  /* Begin scanning the target file and generating copy commands and
  ** literal sections of the delta.
  */
  base = 0;    /* We have already generated everything before zOut[base] */
  while( base+NHASH<lenOut ){
    int iSrc, iBlock;
    int bestCnt, bestOfst=0, bestLitsz=0;
    hash_init(&h, &zOut[base]);
    i = 0;     /* Trying to match a landmark against zOut[base+i] */
    bestCnt = 0;
    while( 1 ){
      int hv;
      int limit = 250;

      hv = hash_32bit(&h) % nHash;
      iBlock = landmark[hv];
      while( iBlock>=0 && (limit--)>0 ){
        /*
        ** The hash window has identified a potential match against
        ** landmark block iBlock.  But we need to investigate further.
        **
        ** Look for a region in zOut that matches zSrc. Anchor the search
        ** at zSrc[iSrc] and zOut[base+i].  Do not include anything prior to
        ** zOut[base] or after zOut[outLen] nor anything after zSrc[srcLen].
        **
        ** Set cnt equal to the length of the match and set ofst so that
        ** zSrc[ofst] is the first element of the match.  litsz is the number
        ** of characters between zOut[base] and the beginning of the match.
        ** sz will be the overhead (in bytes) needed to encode the copy
        ** command.  Only generate copy command if the overhead of the
        ** copy command is less than the amount of literal text to be copied.
        */
        int cnt, ofst, litsz;
        int j, k, x, y;
        int sz;

        /* Beginning at iSrc, match forwards as far as we can.  j counts
        ** the number of characters that match */
        iSrc = iBlock*NHASH;
        for(
          j=0, x=iSrc, y=base+i;
          (unsigned int)x<lenSrc && (unsigned int)y<lenOut;
          j++, x++, y++
        ){
          if( zSrc[x]!=zOut[y] ) break;
        }
        j--;

        /* Beginning at iSrc-1, match backwards as far as we can.  k counts
        ** the number of characters that match */
        for(k=1; k<iSrc && (unsigned int)k<=i; k++){
          if( zSrc[iSrc-k]!=zOut[base+i-k] ) break;
        }
        k--;

        /* Compute the offset and size of the matching region */
        ofst = iSrc-k;
        cnt = j+k+1;
        litsz = i-k;  /* Number of bytes of literal text before the copy */
        /* sz will hold the number of bytes needed to encode the "insert"
        ** command and the copy command, not counting the "insert" text */
        sz = digit_count(i-k)+digit_count(cnt)+digit_count(ofst)+3;
        if( cnt>=sz && cnt>bestCnt ){
          /* Remember this match only if it is the best so far and it
          ** does not increase the file size */
          bestCnt = cnt;
          bestOfst = iSrc-k;
          bestLitsz = litsz;
        }

        /* Check the next matching block */
        iBlock = collide[iBlock];
      }

      /* We have a copy command that does not cause the delta to be larger
      ** than a literal insert.  So add the copy command to the delta.
      */
      if( bestCnt>0 ){
        if( bestLitsz>0 ){
          /* Add an insert command before the copy */
          putInt(bestLitsz,&zDelta);
          *(zDelta++) = ':';
          memcpy(zDelta, &zOut[base], bestLitsz);
          zDelta += bestLitsz;
          base += bestLitsz;
        }
        base += bestCnt;
        putInt(bestCnt, &zDelta);
        *(zDelta++) = '@';
        putInt(bestOfst, &zDelta);
        *(zDelta++) = ',';
        if( bestOfst + bestCnt -1 > lastRead ){
          lastRead = bestOfst + bestCnt - 1;
        }
        bestCnt = 0;
        break;
      }

      /* If we reach this point, it means no match is found so far */
      if( base+i+NHASH>=lenOut ){
        /* We have reached the end of the file and have not found any
        ** matches.  Do an "insert" for everything that does not match */
        putInt(lenOut-base, &zDelta);
        *(zDelta++) = ':';
        memcpy(zDelta, &zOut[base], lenOut-base);
        zDelta += lenOut-base;
        base = lenOut;
        break;
      }

      /* Advance the hash by one character.  Keep looking for a match */
      hash_next(&h, zOut[base+i+NHASH]);
      i++;
    }
  }
  /* Output a final "insert" record to get all the text at the end of
  ** the file that does not match anything in the source file.
  */
  if( base<lenOut ){
    putInt(lenOut-base, &zDelta);
    *(zDelta++) = ':';
    memcpy(zDelta, &zOut[base], lenOut-base);
    zDelta += lenOut-base;
  }
  /* Output the final checksum record. */
  putInt(checksum(zOut, lenOut), &zDelta);
  *(zDelta++) = ';';
  sqlite3_free(collide);
  return (int)(zDelta - zOrigDelta);
}

/*
** End of code copied from fossil.
**************************************************************************/

static void strPrintfArray(
  Str *pStr,                      /* String object to append to */
  const char *zSep,               /* Separator string */
  const char *zFmt,               /* Format for each entry */
  char **az, int n                /* Array of strings & its size (or -1) */
){
  int i;
  for(i=0; az[i] && (i<n || n<0); i++){
    if( i!=0 ) strPrintf(pStr, "%s", zSep);
    strPrintf(pStr, zFmt, az[i], az[i], az[i]);
  }
}

static void getRbudiffQuery(
  const char *zTab,
  char **azCol,
  int nPK,
  int bOtaRowid,
  Str *pSql
){
  int i;

  /* First the newly inserted rows: **/ 
  strPrintf(pSql, "SELECT ");
  strPrintfArray(pSql, ", ", "%s", azCol, -1);
  strPrintf(pSql, ", 0, ");       /* Set ota_control to 0 for an insert */
  strPrintfArray(pSql, ", ", "NULL", azCol, -1);
  strPrintf(pSql, " FROM aux.%Q AS n WHERE NOT EXISTS (\n", zTab);
  strPrintf(pSql, "    SELECT 1 FROM ", zTab);
  strPrintf(pSql, " main.%Q AS o WHERE ", zTab);
  strPrintfArray(pSql, " AND ", "(n.%Q = o.%Q)", azCol, nPK);
  strPrintf(pSql, "\n) AND ");
  strPrintfArray(pSql, " AND ", "(n.%Q IS NOT NULL)", azCol, nPK);

  /* Deleted rows: */
  strPrintf(pSql, "\nUNION ALL\nSELECT ");
  strPrintfArray(pSql, ", ", "%s", azCol, nPK);
  if( azCol[nPK] ){
    strPrintf(pSql, ", ");
    strPrintfArray(pSql, ", ", "NULL", &azCol[nPK], -1);
  }
  strPrintf(pSql, ", 1, ");       /* Set ota_control to 1 for a delete */
  strPrintfArray(pSql, ", ", "NULL", azCol, -1);
  strPrintf(pSql, " FROM main.%Q AS n WHERE NOT EXISTS (\n", zTab);
  strPrintf(pSql, "    SELECT 1 FROM ", zTab);
  strPrintf(pSql, " aux.%Q AS o WHERE ", zTab);
  strPrintfArray(pSql, " AND ", "(n.%Q = o.%Q)", azCol, nPK);
  strPrintf(pSql, "\n) AND ");
  strPrintfArray(pSql, " AND ", "(n.%Q IS NOT NULL)", azCol, nPK);

  /* Updated rows. If all table columns are part of the primary key, there 
  ** can be no updates. In this case this part of the compound SELECT can
  ** be omitted altogether. */
  if( azCol[nPK] ){
    strPrintf(pSql, "\nUNION ALL\nSELECT ");
    strPrintfArray(pSql, ", ", "n.%s", azCol, nPK);
    strPrintf(pSql, ",\n");
    strPrintfArray(pSql, " ,\n", 
        "    CASE WHEN n.%s IS o.%s THEN NULL ELSE n.%s END", &azCol[nPK], -1
    );

    if( bOtaRowid==0 ){
      strPrintf(pSql, ", '");
      strPrintfArray(pSql, "", ".", azCol, nPK);
      strPrintf(pSql, "' ||\n");
    }else{
      strPrintf(pSql, ",\n");
    }
    strPrintfArray(pSql, " ||\n", 
        "    CASE WHEN n.%s IS o.%s THEN '.' ELSE 'x' END", &azCol[nPK], -1
    );
    strPrintf(pSql, "\nAS ota_control, ");
    strPrintfArray(pSql, ", ", "NULL", azCol, nPK);
    strPrintf(pSql, ",\n");
    strPrintfArray(pSql, " ,\n", 
        "    CASE WHEN n.%s IS o.%s THEN NULL ELSE o.%s END", &azCol[nPK], -1
    );

    strPrintf(pSql, "\nFROM main.%Q AS o, aux.%Q AS n\nWHERE ", zTab, zTab);
    strPrintfArray(pSql, " AND ", "(n.%Q = o.%Q)", azCol, nPK);
    strPrintf(pSql, " AND ota_control LIKE '%%x%%'");
  }

  /* Now add an ORDER BY clause to sort everything by PK. */
  strPrintf(pSql, "\nORDER BY ");
  for(i=1; i<=nPK; i++) strPrintf(pSql, "%s%d", ((i>1)?", ":""), i);
}

static void rbudiff_one_table(const char *zTab, FILE *out){
  int bOtaRowid;                  /* True to use an ota_rowid column */
  int nPK;                        /* Number of primary key columns in table */
  char **azCol;                   /* NULL terminated array of col names */
  int i;
  int nCol;
  Str ct = {0, 0, 0};             /* The "CREATE TABLE data_xxx" statement */
  Str sql = {0, 0, 0};            /* Query to find differences */
  Str insert = {0, 0, 0};         /* First part of output INSERT statement */
  sqlite3_stmt *pStmt = 0;
  int nRow = 0;                   /* Total rows in data_xxx table */

  /* --rbu mode must use real primary keys. */
  g.bSchemaPK = 1;

  /* Check that the schemas of the two tables match. Exit early otherwise. */
  checkSchemasMatch(zTab);

  /* Grab the column names and PK details for the table(s). If no usable PK
  ** columns are found, bail out early.  */
  azCol = columnNames("main", zTab, &nPK, &bOtaRowid);
  if( azCol==0 ){
    runtimeError("table %s has no usable PK columns", zTab);
  }
  for(nCol=0; azCol[nCol]; nCol++);

  /* Build and output the CREATE TABLE statement for the data_xxx table */
  strPrintf(&ct, "CREATE TABLE IF NOT EXISTS 'data_%q'(", zTab);
  if( bOtaRowid ) strPrintf(&ct, "rbu_rowid, ");
  strPrintfArray(&ct, ", ", "%s", &azCol[bOtaRowid], -1);
  strPrintf(&ct, ", rbu_control);");

  /* Get the SQL for the query to retrieve data from the two databases */
  getRbudiffQuery(zTab, azCol, nPK, bOtaRowid, &sql);

  /* Build the first part of the INSERT statement output for each row
  ** in the data_xxx table. */
  strPrintf(&insert, "INSERT INTO 'data_%q' (", zTab);
  if( bOtaRowid ) strPrintf(&insert, "rbu_rowid, ");
  strPrintfArray(&insert, ", ", "%s", &azCol[bOtaRowid], -1);
  strPrintf(&insert, ", rbu_control) VALUES(");

  pStmt = db_prepare("%s", sql.z);

  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    
    /* If this is the first row output, print out the CREATE TABLE 
    ** statement first. And then set ct.z to NULL so that it is not 
    ** printed again.  */
    if( ct.z ){
      fprintf(out, "%s\n", ct.z);
      strFree(&ct);
    }

    /* Output the first part of the INSERT statement */
    fprintf(out, "%s", insert.z);
    nRow++;

    if( sqlite3_column_type(pStmt, nCol)==SQLITE_INTEGER ){
      for(i=0; i<=nCol; i++){
        if( i>0 ) fprintf(out, ", ");
        printQuoted(out, sqlite3_column_value(pStmt, i));
      }
    }else{
      char *zOtaControl;
      int nOtaControl = sqlite3_column_bytes(pStmt, nCol);

      zOtaControl = (char*)sqlite3_malloc(nOtaControl+1);
      memcpy(zOtaControl, sqlite3_column_text(pStmt, nCol), nOtaControl+1);

      for(i=0; i<nCol; i++){
        int bDone = 0;
        if( i>=nPK 
            && sqlite3_column_type(pStmt, i)==SQLITE_BLOB
            && sqlite3_column_type(pStmt, nCol+1+i)==SQLITE_BLOB
        ){
          const char *aSrc = sqlite3_column_blob(pStmt, nCol+1+i);
          int nSrc = sqlite3_column_bytes(pStmt, nCol+1+i);
          const char *aFinal = sqlite3_column_blob(pStmt, i);
          int nFinal = sqlite3_column_bytes(pStmt, i);
          char *aDelta;
          int nDelta;

          aDelta = sqlite3_malloc(nFinal + 60);
          nDelta = rbuDeltaCreate(aSrc, nSrc, aFinal, nFinal, aDelta);
          if( nDelta<nFinal ){
            int j;
            fprintf(out, "x'");
            for(j=0; j<nDelta; j++) fprintf(out, "%02x", (u8)aDelta[j]);
            fprintf(out, "'");
            zOtaControl[i-bOtaRowid] = 'f';
            bDone = 1;
          }
          sqlite3_free(aDelta);
        }

        if( bDone==0 ){
          printQuoted(out, sqlite3_column_value(pStmt, i));
        }
        fprintf(out, ", ");
      }
      fprintf(out, "'%s'", zOtaControl);
      sqlite3_free(zOtaControl);
    }

    /* And the closing bracket of the insert statement */
    fprintf(out, ");\n");
  }

  sqlite3_finalize(pStmt);
  if( nRow>0 ){
    Str cnt = {0, 0, 0};
    strPrintf(&cnt, "INSERT INTO rbu_count VALUES('data_%q', %d);", zTab, nRow);
    fprintf(out, "%s\n", cnt.z);
    strFree(&cnt);
  }

  strFree(&ct);
  strFree(&sql);
  strFree(&insert);
}

/*
** Display a summary of differences between two versions of the same
** table table.
**
**   *  Number of rows changed
**   *  Number of rows added
**   *  Number of rows deleted
**   *  Number of identical rows
*/
static void summarize_one_table(const char *zTab, FILE *out){
  char *zId = safeId(zTab); /* Name of table (translated for us in SQL) */
  char **az = 0;            /* Columns in main */
  char **az2 = 0;           /* Columns in aux */
  int nPk;                  /* Primary key columns in main */
  int nPk2;                 /* Primary key columns in aux */
  int n = 0;                /* Number of columns in main */
  int n2;                   /* Number of columns in aux */
  int i;                    /* Loop counter */
  const char *zSep;         /* Separator string */
  Str sql;                  /* Comparison query */
  sqlite3_stmt *pStmt;      /* Query statement to do the diff */
  sqlite3_int64 nUpdate;    /* Number of updated rows */
  sqlite3_int64 nUnchanged; /* Number of unmodified rows */
  sqlite3_int64 nDelete;    /* Number of deleted rows */
  sqlite3_int64 nInsert;    /* Number of inserted rows */

  strInit(&sql);
  if( sqlite3_table_column_metadata(g.db,"aux",zTab,0,0,0,0,0,0) ){
    if( !sqlite3_table_column_metadata(g.db,"main",zTab,0,0,0,0,0,0) ){
      /* Table missing from second database. */
      fprintf(out, "%s: missing from second database\n", zTab);
    }
    goto end_summarize_one_table;
  }

  if( sqlite3_table_column_metadata(g.db,"main",zTab,0,0,0,0,0,0) ){
    /* Table missing from source */
    fprintf(out, "%s: missing from first database\n", zTab);
    goto end_summarize_one_table;
  }

  az = columnNames("main", zTab, &nPk, 0);
  az2 = columnNames("aux", zTab, &nPk2, 0);
  if( az && az2 ){
    for(n=0; az[n]; n++){
      if( sqlite3_stricmp(az[n],az2[n])!=0 ) break;
    }
  }
  if( az==0
   || az2==0
   || nPk!=nPk2
   || az[n]
  ){
    /* Schema mismatch */
    fprintf(out, "%s: incompatible schema\n", zTab);
    goto end_summarize_one_table;
  }

  /* Build the comparison query */
  for(n2=n; az[n2]; n2++){}
  strPrintf(&sql, "SELECT 1, count(*)");
  if( n2==nPk2 ){
    strPrintf(&sql, ", 0\n");
  }else{
    zSep = ", sum(";
    for(i=nPk; az[i]; i++){
      strPrintf(&sql, "%sA.%s IS NOT B.%s", zSep, az[i], az[i]);
      zSep = " OR ";
    }
    strPrintf(&sql, ")\n");
  }
  strPrintf(&sql, "  FROM main.%s A, aux.%s B\n", zId, zId);
  zSep = " WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
    zSep = " AND";
  }
  strPrintf(&sql, " UNION ALL\n");
  strPrintf(&sql, "SELECT 2, count(*), 0\n");
  strPrintf(&sql, "  FROM main.%s A\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM aux.%s B ", zId);
  zSep = "WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n");
  strPrintf(&sql, " UNION ALL\n");
  strPrintf(&sql, "SELECT 3, count(*), 0\n");
  strPrintf(&sql, "  FROM aux.%s B\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM main.%s A ", zId);
  zSep = "WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, az[i], az[i]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n ORDER BY 1;\n");

  if( (g.fDebug & DEBUG_DIFF_SQL)!=0 ){ 
    printf("SQL for %s:\n%s\n", zId, sql.z);
    goto end_summarize_one_table;
  }

  /* Run the query and output difference summary */
  pStmt = db_prepare("%s", sql.z);
  nUpdate = 0;
  nInsert = 0;
  nDelete = 0;
  nUnchanged = 0;
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    switch( sqlite3_column_int(pStmt,0) ){
      case 1:
        nUpdate = sqlite3_column_int64(pStmt,2);
        nUnchanged = sqlite3_column_int64(pStmt,1) - nUpdate;
        break;
      case 2:
        nDelete = sqlite3_column_int64(pStmt,1);
        break;
      case 3:
        nInsert = sqlite3_column_int64(pStmt,1);
        break;
    }
  }
  sqlite3_finalize(pStmt);
  fprintf(out, "%s: %lld changes, %lld inserts, %lld deletes, %lld unchanged\n",
          zTab, nUpdate, nInsert, nDelete, nUnchanged);

end_summarize_one_table:
  strFree(&sql);
  sqlite3_free(zId);
  namelistFree(az);
  namelistFree(az2);
  return;
}

/*
** Write a 64-bit signed integer as a varint onto out
*/
static void putsVarint(FILE *out, sqlite3_uint64 v){
  int i, n;
  unsigned char p[12];
  if( v & (((sqlite3_uint64)0xff000000)<<32) ){
    p[8] = (unsigned char)v;
    v >>= 8;
    for(i=7; i>=0; i--){
      p[i] = (unsigned char)((v & 0x7f) | 0x80);
      v >>= 7;
    }
    fwrite(p, 8, 1, out);
  }else{
    n = 9;
    do{
      p[n--] = (unsigned char)((v & 0x7f) | 0x80);
      v >>= 7;
    }while( v!=0 );
    p[9] &= 0x7f;
    fwrite(p+n+1, 9-n, 1, out);
  }
}

/*
** Write an SQLite value onto out.
*/
static void putValue(FILE *out, sqlite3_stmt *pStmt, int k){
  int iDType = sqlite3_column_type(pStmt, k);
  sqlite3_int64 iX;
  double rX;
  sqlite3_uint64 uX;
  int j;

  putc(iDType, out);
  switch( iDType ){
    case SQLITE_INTEGER:
      iX = sqlite3_column_int64(pStmt, k);
      memcpy(&uX, &iX, 8);
      for(j=56; j>=0; j-=8) putc((uX>>j)&0xff, out);
      break;
    case SQLITE_FLOAT:
      rX = sqlite3_column_double(pStmt, k);
      memcpy(&uX, &rX, 8);
      for(j=56; j>=0; j-=8) putc((uX>>j)&0xff, out);
      break;
    case SQLITE_TEXT:
      iX = sqlite3_column_bytes(pStmt, k);
      putsVarint(out, (sqlite3_uint64)iX);
      fwrite(sqlite3_column_text(pStmt, k),1,(size_t)iX,out);
      break;
    case SQLITE_BLOB:
      iX = sqlite3_column_bytes(pStmt, k);
      putsVarint(out, (sqlite3_uint64)iX);
      fwrite(sqlite3_column_blob(pStmt, k),1,(size_t)iX,out);
      break;
    case SQLITE_NULL:
      break;
  }
}

/*
** Generate a CHANGESET for all differences from main.zTab to aux.zTab.
*/
static void changeset_one_table(const char *zTab, FILE *out){
  sqlite3_stmt *pStmt;          /* SQL statment */
  char *zId = safeId(zTab);     /* Escaped name of the table */
  char **azCol = 0;             /* List of escaped column names */
  int nCol = 0;                 /* Number of columns */
  int *aiFlg = 0;               /* 0 if column is not part of PK */
  int *aiPk = 0;                /* Column numbers for each PK column */
  int nPk = 0;                  /* Number of PRIMARY KEY columns */
  Str sql;                      /* SQL for the diff query */
  int i, k;                     /* Loop counters */
  const char *zSep;             /* List separator */

  /* Check that the schemas of the two tables match. Exit early otherwise. */
  checkSchemasMatch(zTab);

  pStmt = db_prepare("PRAGMA main.table_info=%Q", zTab);
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    nCol++;
    azCol = sqlite3_realloc(azCol, sizeof(char*)*nCol);
    if( azCol==0 ) runtimeError("out of memory");
    aiFlg = sqlite3_realloc(aiFlg, sizeof(int)*nCol);
    if( aiFlg==0 ) runtimeError("out of memory");
    azCol[nCol-1] = safeId((const char*)sqlite3_column_text(pStmt,1));
    aiFlg[nCol-1] = i = sqlite3_column_int(pStmt,5);
    if( i>0 ){
      if( i>nPk ){
        nPk = i;
        aiPk = sqlite3_realloc(aiPk, sizeof(int)*nPk);
        if( aiPk==0 ) runtimeError("out of memory");
      }
      aiPk[i-1] = nCol-1;
    }
  }
  sqlite3_finalize(pStmt);
  if( nPk==0 ) goto end_changeset_one_table; 
  strInit(&sql);
  if( nCol>nPk ){
    strPrintf(&sql, "SELECT %d", SQLITE_UPDATE);
    for(i=0; i<nCol; i++){
      if( aiFlg[i] ){
        strPrintf(&sql, ",\n       A.%s", azCol[i]);
      }else{
        strPrintf(&sql, ",\n       A.%s IS NOT B.%s, A.%s, B.%s",
                  azCol[i], azCol[i], azCol[i], azCol[i]);
      }
    }
    strPrintf(&sql,"\n  FROM main.%s A, aux.%s B\n", zId, zId);
    zSep = " WHERE";
    for(i=0; i<nPk; i++){
      strPrintf(&sql, "%s A.%s=B.%s", zSep, azCol[aiPk[i]], azCol[aiPk[i]]);
      zSep = " AND";
    }
    zSep = "\n   AND (";
    for(i=0; i<nCol; i++){
      if( aiFlg[i] ) continue;
      strPrintf(&sql, "%sA.%s IS NOT B.%s", zSep, azCol[i], azCol[i]);
      zSep = " OR\n        ";
    }
    strPrintf(&sql,")\n UNION ALL\n");
  }
  strPrintf(&sql, "SELECT %d", SQLITE_DELETE);
  for(i=0; i<nCol; i++){
    if( aiFlg[i] ){
      strPrintf(&sql, ",\n       A.%s", azCol[i]);
    }else{
      strPrintf(&sql, ",\n       1, A.%s, NULL", azCol[i]);
    }
  }
  strPrintf(&sql, "\n  FROM main.%s A\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM aux.%s B\n", zId);
  zSep =          "                   WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, azCol[aiPk[i]], azCol[aiPk[i]]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n UNION ALL\n");
  strPrintf(&sql, "SELECT %d", SQLITE_INSERT);
  for(i=0; i<nCol; i++){
    if( aiFlg[i] ){
      strPrintf(&sql, ",\n       B.%s", azCol[i]);
    }else{
      strPrintf(&sql, ",\n       1, NULL, B.%s", azCol[i]);
    }
  }
  strPrintf(&sql, "\n  FROM aux.%s B\n", zId);
  strPrintf(&sql, " WHERE NOT EXISTS(SELECT 1 FROM main.%s A\n", zId);
  zSep =          "                   WHERE";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s A.%s=B.%s", zSep, azCol[aiPk[i]], azCol[aiPk[i]]);
    zSep = " AND";
  }
  strPrintf(&sql, ")\n");
  strPrintf(&sql, " ORDER BY");
  zSep = " ";
  for(i=0; i<nPk; i++){
    strPrintf(&sql, "%s %d", zSep, aiPk[i]+2);
    zSep = ",";
  }
  strPrintf(&sql, ";\n");

  if( g.fDebug & DEBUG_DIFF_SQL ){ 
    printf("SQL for %s:\n%s\n", zId, sql.z);
    goto end_changeset_one_table;
  }

  putc('T', out);
  putsVarint(out, (sqlite3_uint64)nCol);
  for(i=0; i<nCol; i++) putc(aiFlg[i], out);
  fwrite(zTab, 1, strlen(zTab), out);
  putc(0, out);

  pStmt = db_prepare("%s", sql.z);
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    int iType = sqlite3_column_int(pStmt,0);
    putc(iType, out);
    putc(0, out);
    switch( sqlite3_column_int(pStmt,0) ){
      case SQLITE_UPDATE: {
        for(k=1, i=0; i<nCol; i++){
          if( aiFlg[i] ){
            putValue(out, pStmt, k);
            k++;
          }else if( sqlite3_column_int(pStmt,k) ){
            putValue(out, pStmt, k+1);
            k += 3;
          }else{
            putc(0, out);
            k += 3;
          }
        }
        for(k=1, i=0; i<nCol; i++){
          if( aiFlg[i] ){
            putc(0, out);
            k++;
          }else if( sqlite3_column_int(pStmt,k) ){
            putValue(out, pStmt, k+2);
            k += 3;
          }else{
            putc(0, out);
            k += 3;
          }
        }
        break;
      }
      case SQLITE_INSERT: {
        for(k=1, i=0; i<nCol; i++){
          if( aiFlg[i] ){
            putValue(out, pStmt, k);
            k++;
          }else{
            putValue(out, pStmt, k+2);
            k += 3;
          }
        }
        break;
      }
      case SQLITE_DELETE: {
        for(k=1, i=0; i<nCol; i++){
          if( aiFlg[i] ){
            putValue(out, pStmt, k);
            k++;
          }else{
            putValue(out, pStmt, k+1);
            k += 3;
          }
        }
        break;
      }
    }
  }
  sqlite3_finalize(pStmt);
  
end_changeset_one_table:
  while( nCol>0 ) sqlite3_free(azCol[--nCol]);
  sqlite3_free(azCol);
  sqlite3_free(aiPk);
  sqlite3_free(zId);
}

/*
** Extract the next SQL keyword or quoted string from buffer zIn and copy it
** (or a prefix of it if it will not fit) into buffer zBuf, size nBuf bytes.
** Return a pointer to the character within zIn immediately following 
** the token or quoted string just extracted.
*/
const char *gobble_token(const char *zIn, char *zBuf, int nBuf){
  const char *p = zIn;
  char *pOut = zBuf;
  char *pEnd = &pOut[nBuf-1];
  char q = 0;                     /* quote character, if any */

  if( p==0 ) return 0;
  while( *p==' ' ) p++;
  switch( *p ){
    case '"': q = '"'; break;
    case '\'': q = '\''; break;
    case '`': q = '`'; break;
    case '[': q = ']'; break;
  }

  if( q ){
    p++;
    while( *p && pOut<pEnd ){
      if( *p==q ){
        p++;
        if( *p!=q ) break;
      }
      if( pOut<pEnd ) *pOut++ = *p;
      p++;
    }
  }else{
    while( *p && *p!=' ' && *p!='(' ){
      if( pOut<pEnd ) *pOut++ = *p;
      p++;
    }
  }

  *pOut = '\0';
  return p;
}

/*
** This function is the implementation of SQL scalar function "module_name":
**
**   module_name(SQL)
**
** The only argument should be an SQL statement of the type that may appear
** in the sqlite_schema table. If the statement is a "CREATE VIRTUAL TABLE"
** statement, then the value returned is the name of the module that it
** uses. Otherwise, if the statement is not a CVT, NULL is returned.
*/
static void module_name_func(
  sqlite3_context *pCtx, 
  int nVal, sqlite3_value **apVal
){
  const char *zSql;
  char zToken[32];

  assert( nVal==1 );
  zSql = (const char*)sqlite3_value_text(apVal[0]);

  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  if( zSql==0 || sqlite3_stricmp(zToken, "create") ) return;
  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  if( zSql==0 || sqlite3_stricmp(zToken, "virtual") ) return;
  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  if( zSql==0 || sqlite3_stricmp(zToken, "table") ) return;
  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  if( zSql==0 ) return;
  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  if( zSql==0 || sqlite3_stricmp(zToken, "using") ) return;
  zSql = gobble_token(zSql, zToken, sizeof(zToken));
  
  sqlite3_result_text(pCtx, zToken, -1, SQLITE_TRANSIENT);
}

/*
** Return the text of an SQL statement that itself returns the list of
** tables to process within the database.
*/
const char *all_tables_sql(){
  if( g.bHandleVtab ){
    int rc;
  
    rc = sqlite3_exec(g.db, 
        "CREATE TEMP TABLE tblmap(module COLLATE nocase, postfix);"
        "INSERT INTO temp.tblmap VALUES"
        "('fts3', '_content'), ('fts3', '_segments'), ('fts3', '_segdir'),"
  
        "('fts4', '_content'), ('fts4', '_segments'), ('fts4', '_segdir'),"
        "('fts4', '_docsize'), ('fts4', '_stat'),"
  
        "('fts5', '_data'), ('fts5', '_idx'), ('fts5', '_content'),"
        "('fts5', '_docsize'), ('fts5', '_config'),"
  
        "('rtree', '_node'), ('rtree', '_rowid'), ('rtree', '_parent');"
        , 0, 0, 0
    );
    assert( rc==SQLITE_OK );
  
    rc = sqlite3_create_function(
        g.db, "module_name", 1, SQLITE_UTF8, 0, module_name_func, 0, 0
    );
    assert( rc==SQLITE_OK );
  
    return 
      "SELECT name FROM main.sqlite_schema\n"
      " WHERE type='table' AND (\n"
      "    module_name(sql) IS NULL OR \n"
      "    module_name(sql) IN (SELECT module FROM temp.tblmap)\n"
      " ) AND name NOT IN (\n"
      "  SELECT a.name || b.postfix \n"
        "FROM main.sqlite_schema AS a, temp.tblmap AS b \n"
        "WHERE module_name(a.sql) = b.module\n" 
      " )\n"
      "UNION \n"
      "SELECT name FROM aux.sqlite_schema\n"
      " WHERE type='table' AND (\n"
      "    module_name(sql) IS NULL OR \n"
      "    module_name(sql) IN (SELECT module FROM temp.tblmap)\n"
      " ) AND name NOT IN (\n"
      "  SELECT a.name || b.postfix \n"
        "FROM aux.sqlite_schema AS a, temp.tblmap AS b \n"
        "WHERE module_name(a.sql) = b.module\n" 
      " )\n"
      " ORDER BY name";
  }else{
    return
      "SELECT name FROM main.sqlite_schema\n"
      " WHERE type='table' AND sql NOT LIKE 'CREATE VIRTUAL%%'\n"
      " UNION\n"
      "SELECT name FROM aux.sqlite_schema\n"
      " WHERE type='table' AND sql NOT LIKE 'CREATE VIRTUAL%%'\n"
      " ORDER BY name";
  }
}

/*
** Print sketchy documentation for this utility program
*/
static void showHelp(void){
  printf("Usage: %s [options] DB1 DB2\n", g.zArgv0);
  printf(
"Output SQL text that would transform DB1 into DB2.\n"
"Options:\n"
"  --changeset FILE      Write a CHANGESET into FILE\n"
"  -L|--lib LIBRARY      Load an SQLite extension library\n"
"  --primarykey          Use schema-defined PRIMARY KEYs\n"
"  --rbu                 Output SQL to create/populate RBU table(s)\n"
"  --schema              Show only differences in the schema\n"
"  --summary             Show only a summary of the differences\n"
"  --table TAB           Show only differences in table TAB\n"
"  --transaction         Show SQL output inside a transaction\n"
"  --vtab                Handle fts3, fts4, fts5 and rtree tables\n"
  );
}

int main(int argc, char **argv){
  const char *zDb1 = 0;
  const char *zDb2 = 0;
  int i;
  int rc;
  char *zErrMsg = 0;
  char *zSql;
  sqlite3_stmt *pStmt;
  char *zTab = 0;
  FILE *out = stdout;
  void (*xDiff)(const char*,FILE*) = diff_one_table;
#ifndef SQLITE_OMIT_LOAD_EXTENSION
  int nExt = 0;
  char **azExt = 0;
#endif
  int useTransaction = 0;
  int neverUseTransaction = 0;

  g.zArgv0 = argv[0];
  sqlite3_config(SQLITE_CONFIG_SINGLETHREAD);
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( z[0]=='-' ){
      z++;
      if( z[0]=='-' ) z++;
      if( strcmp(z,"changeset")==0 ){
        if( i==argc-1 ) cmdlineError("missing argument to %s", argv[i]);
        out = fopen(argv[++i], "wb");
        if( out==0 ) cmdlineError("cannot open: %s", argv[i]);
        xDiff = changeset_one_table;
        neverUseTransaction = 1;
      }else
      if( strcmp(z,"debug")==0 ){
        if( i==argc-1 ) cmdlineError("missing argument to %s", argv[i]);
        g.fDebug = strtol(argv[++i], 0, 0);
      }else
      if( strcmp(z,"help")==0 ){
        showHelp();
        return 0;
      }else
#ifndef SQLITE_OMIT_LOAD_EXTENSION
      if( strcmp(z,"lib")==0 || strcmp(z,"L")==0 ){
        if( i==argc-1 ) cmdlineError("missing argument to %s", argv[i]);
        azExt = realloc(azExt, sizeof(azExt[0])*(nExt+1));
        if( azExt==0 ) cmdlineError("out of memory");
        azExt[nExt++] = argv[++i];
      }else
#endif
      if( strcmp(z,"primarykey")==0 ){
        g.bSchemaPK = 1;
      }else
      if( strcmp(z,"rbu")==0 ){
        xDiff = rbudiff_one_table;
      }else
      if( strcmp(z,"schema")==0 ){
        g.bSchemaOnly = 1;
      }else
      if( strcmp(z,"summary")==0 ){
        xDiff = summarize_one_table;
      }else
      if( strcmp(z,"table")==0 ){
        if( i==argc-1 ) cmdlineError("missing argument to %s", argv[i]);
        zTab = argv[++i];
      }else
      if( strcmp(z,"transaction")==0 ){
        useTransaction = 1;
      }else
      if( strcmp(z,"vtab")==0 ){
        g.bHandleVtab = 1;
      }else
      {
        cmdlineError("unknown option: %s", argv[i]);
      }
    }else if( zDb1==0 ){
      zDb1 = argv[i];
    }else if( zDb2==0 ){
      zDb2 = argv[i];
    }else{
      cmdlineError("unknown argument: %s", argv[i]);
    }
  }
  if( zDb2==0 ){
    cmdlineError("two database arguments required");
  }
  rc = sqlite3_open(zDb1, &g.db);
  if( rc ){
    cmdlineError("cannot open database file \"%s\"", zDb1);
  }
  rc = sqlite3_exec(g.db, "SELECT * FROM sqlite_schema", 0, 0, &zErrMsg);
  if( rc || zErrMsg ){
    cmdlineError("\"%s\" does not appear to be a valid SQLite database", zDb1);
  }
#ifndef SQLITE_OMIT_LOAD_EXTENSION
  sqlite3_enable_load_extension(g.db, 1);
  for(i=0; i<nExt; i++){
    rc = sqlite3_load_extension(g.db, azExt[i], 0, &zErrMsg);
    if( rc || zErrMsg ){
      cmdlineError("error loading %s: %s", azExt[i], zErrMsg);
    }
  }
  free(azExt);
#endif
  zSql = sqlite3_mprintf("ATTACH %Q as aux;", zDb2);
  rc = sqlite3_exec(g.db, zSql, 0, 0, &zErrMsg);
  if( rc || zErrMsg ){
    cmdlineError("cannot attach database \"%s\"", zDb2);
  }
  rc = sqlite3_exec(g.db, "SELECT * FROM aux.sqlite_schema", 0, 0, &zErrMsg);
  if( rc || zErrMsg ){
    cmdlineError("\"%s\" does not appear to be a valid SQLite database", zDb2);
  }

  if( neverUseTransaction ) useTransaction = 0;
  if( useTransaction ) fprintf(out, "BEGIN TRANSACTION;\n");
  if( xDiff==rbudiff_one_table ){
    fprintf(out, "CREATE TABLE IF NOT EXISTS rbu_count"
           "(tbl TEXT PRIMARY KEY COLLATE NOCASE, cnt INTEGER) "
           "WITHOUT ROWID;\n"
    );
  }
  if( zTab ){
    xDiff(zTab, out);
  }else{
    /* Handle tables one by one */
    pStmt = db_prepare("%s", all_tables_sql() );
    while( SQLITE_ROW==sqlite3_step(pStmt) ){
      xDiff((const char*)sqlite3_column_text(pStmt,0), out);
    }
    sqlite3_finalize(pStmt);
  }
  if( useTransaction ) printf("COMMIT;\n");

  /* TBD: Handle trigger differences */
  /* TBD: Handle view differences */
  sqlite3_close(g.db);
  return 0;
}
