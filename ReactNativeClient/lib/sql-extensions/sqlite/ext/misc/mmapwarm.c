/*
** 2017-09-18
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
*/

#include "sqlite3.h"


/*
** This function is used to touch each page of a mapping of a memory
** mapped SQLite database. Assuming that the system has sufficient free
** memory and supports sufficiently large mappings, this causes the OS 
** to cache the entire database in main memory, making subsequent 
** database accesses faster.
**
** If the second parameter to this function is not NULL, it is the name of
** the specific database to operate on (i.e. "main" or the name of an
** attached database).
**
** SQLITE_OK is returned if successful, or an SQLite error code otherwise.
** It is not considered an error if the file is not memory-mapped, or if
** the mapping does not span the entire file. If an error does occur, a
** transaction may be left open on the database file.
**
** It is illegal to call this function when the database handle has an 
** open transaction. SQLITE_MISUSE is returned in this case.
*/
int sqlite3_mmap_warm(sqlite3 *db, const char *zDb){
  int rc = SQLITE_OK;
  char *zSql = 0;
  int pgsz = 0;
  int nTotal = 0;

  if( 0==sqlite3_get_autocommit(db) ) return SQLITE_MISUSE;

  /* Open a read-only transaction on the file in question */
  zSql = sqlite3_mprintf("BEGIN; SELECT * FROM %s%q%ssqlite_schema", 
      (zDb ? "'" : ""), (zDb ? zDb : ""), (zDb ? "'." : "")
  );
  if( zSql==0 ) return SQLITE_NOMEM;
  rc = sqlite3_exec(db, zSql, 0, 0, 0);
  sqlite3_free(zSql);

  /* Find the SQLite page size of the file */
  if( rc==SQLITE_OK ){
    zSql = sqlite3_mprintf("PRAGMA %s%q%spage_size", 
        (zDb ? "'" : ""), (zDb ? zDb : ""), (zDb ? "'." : "")
    );
    if( zSql==0 ){
      rc = SQLITE_NOMEM;
    }else{
      sqlite3_stmt *pPgsz = 0;
      rc = sqlite3_prepare_v2(db, zSql, -1, &pPgsz, 0);
      sqlite3_free(zSql);
      if( rc==SQLITE_OK ){
        if( sqlite3_step(pPgsz)==SQLITE_ROW ){
          pgsz = sqlite3_column_int(pPgsz, 0);
        }
        rc = sqlite3_finalize(pPgsz);
      }
      if( rc==SQLITE_OK && pgsz==0 ){
        rc = SQLITE_ERROR;
      }
    }
  }

  /* Touch each mmap'd page of the file */
  if( rc==SQLITE_OK ){
    int rc2;
    sqlite3_file *pFd = 0;
    rc = sqlite3_file_control(db, zDb, SQLITE_FCNTL_FILE_POINTER, &pFd);
    if( rc==SQLITE_OK && pFd->pMethods->iVersion>=3 ){
      sqlite3_int64 iPg = 1;
      sqlite3_io_methods const *p = pFd->pMethods;
      while( 1 ){
        unsigned char *pMap;
        rc = p->xFetch(pFd, pgsz*iPg, pgsz, (void**)&pMap);
        if( rc!=SQLITE_OK || pMap==0 ) break;

        nTotal += pMap[0];
        nTotal += pMap[pgsz-1];

        rc = p->xUnfetch(pFd, pgsz*iPg, (void*)pMap);
        if( rc!=SQLITE_OK ) break;
        iPg++;
      }
      sqlite3_log(SQLITE_OK, 
          "sqlite3_mmap_warm_cache: Warmed up %d pages of %s", iPg==1?0:iPg,
          sqlite3_db_filename(db, zDb)
      );
    }

    rc2 = sqlite3_exec(db, "END", 0, 0, 0);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  return rc;
}
