/*
** 2016-05-05
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
** This file implements a utility function (and a utility program) that
** makes a copy of an SQLite database while simultaneously zeroing out all
** deleted content.
**
** Normally (when PRAGMA secure_delete=OFF, which is the default) when SQLite
** deletes content, it does not overwrite the deleted content but rather marks
** the region of the file that held that content as being reusable.  This can
** cause deleted content to recoverable from the database file.  This stale
** content is removed by the VACUUM command, but VACUUM can be expensive for
** large databases.  When in PRAGMA secure_delete=ON mode, the deleted content
** is zeroed, but secure_delete=ON has overhead as well.
**
** This utility attempts to make a copy of a complete SQLite database where
** all of the deleted content is zeroed out in the copy, and it attempts to
** do so while being faster than running VACUUM.
**
** Usage:
**
**   int sqlite3_scrub_backup(
**       const char *zSourceFile,   // Source database filename
**       const char *zDestFile,     // Destination database filename
**       char **pzErrMsg            // Write error message here
**   );
**
** Simply call the API above specifying the filename of the source database
** and the name of the backup copy.  The source database must already exist
** and can be in active use. (A read lock is held during the backup.)  The
** destination file should not previously exist.  If the pzErrMsg parameter
** is non-NULL and if an error occurs, then an error message might be written
** into memory obtained from sqlite3_malloc() and *pzErrMsg made to point to
** that error message.  But if the error is an OOM, the error might not be
** reported.  The routine always returns non-zero if there is an error.
**
** If compiled with -DSCRUB_STANDALONE then a main() procedure is added and
** this file becomes a standalone program that can be run as follows:
**
**      ./sqlite3scrub SOURCE DEST
*/
#include "sqlite3.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>

typedef struct ScrubState ScrubState;
typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;


/* State information for a scrub-and-backup operation */
struct ScrubState {
  const char *zSrcFile;    /* Name of the source file */
  const char *zDestFile;   /* Name of the destination file */
  int rcErr;               /* Error code */
  char *zErr;              /* Error message text */
  sqlite3 *dbSrc;          /* Source database connection */
  sqlite3_file *pSrc;      /* Source file handle */
  sqlite3 *dbDest;         /* Destination database connection */
  sqlite3_file *pDest;     /* Destination file handle */
  u32 szPage;              /* Page size */
  u32 szUsable;            /* Usable bytes on each page */
  u32 nPage;               /* Number of pages */
  u32 iLastPage;           /* Page number of last page written so far*/
  u8 *page1;               /* Content of page 1 */
};

/* Store an error message */
static void scrubBackupErr(ScrubState *p, const char *zFormat, ...){
  va_list ap;
  sqlite3_free(p->zErr);
  va_start(ap, zFormat);
  p->zErr = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( p->rcErr==0 ) p->rcErr = SQLITE_ERROR;
}

/* Allocate memory to hold a single page of content */
static u8 *scrubBackupAllocPage(ScrubState *p){
  u8 *pPage;
  if( p->rcErr ) return 0;
  pPage = sqlite3_malloc( p->szPage );
  if( pPage==0 ) p->rcErr = SQLITE_NOMEM;
  return pPage;
}

/* Read a page from the source database into memory.  Use the memory
** provided by pBuf if not NULL or allocate a new page if pBuf==NULL.
*/
static u8 *scrubBackupRead(ScrubState *p, int pgno, u8 *pBuf){
  int rc;
  sqlite3_int64 iOff;
  u8 *pOut = pBuf;
  if( p->rcErr ) return 0;
  if( pOut==0 ){
    pOut = scrubBackupAllocPage(p);
    if( pOut==0 ) return 0;
  }
  iOff = (pgno-1)*(sqlite3_int64)p->szPage;
  rc = p->pSrc->pMethods->xRead(p->pSrc, pOut, p->szPage, iOff);
  if( rc!=SQLITE_OK ){
    if( pBuf==0 ) sqlite3_free(pOut);
    pOut = 0;
    scrubBackupErr(p, "read failed for page %d", pgno);
    p->rcErr = SQLITE_IOERR;
  }
  return pOut;  
}

/* Write a page to the destination database */
static void scrubBackupWrite(ScrubState *p, int pgno, const u8 *pData){
  int rc;
  sqlite3_int64 iOff;
  if( p->rcErr ) return;
  iOff = (pgno-1)*(sqlite3_int64)p->szPage;
  rc = p->pDest->pMethods->xWrite(p->pDest, pData, p->szPage, iOff);
  if( rc!=SQLITE_OK ){
    scrubBackupErr(p, "write failed for page %d", pgno);
    p->rcErr = SQLITE_IOERR;
  }
  if( (u32)pgno>p->iLastPage ) p->iLastPage = pgno;
}

/* Prepare a statement against the "db" database. */
static sqlite3_stmt *scrubBackupPrepare(
  ScrubState *p,      /* Backup context */
  sqlite3 *db,        /* Database to prepare against */
  const char *zSql    /* SQL statement */
){
  sqlite3_stmt *pStmt;
  if( p->rcErr ) return 0;
  p->rcErr = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( p->rcErr ){
    scrubBackupErr(p, "SQL error \"%s\" on \"%s\"",
                   sqlite3_errmsg(db), zSql);
    sqlite3_finalize(pStmt);
    return 0;
  }
  return pStmt;
}


/* Open the source database file */
static void scrubBackupOpenSrc(ScrubState *p){
  sqlite3_stmt *pStmt;
  int rc;
  /* Open the source database file */
  p->rcErr = sqlite3_open_v2(p->zSrcFile, &p->dbSrc,
                 SQLITE_OPEN_READWRITE |
                 SQLITE_OPEN_URI | SQLITE_OPEN_PRIVATECACHE, 0);
  if( p->rcErr ){
    scrubBackupErr(p, "cannot open source database: %s",
                      sqlite3_errmsg(p->dbSrc));
    return;
  }
  p->rcErr = sqlite3_exec(p->dbSrc, "SELECT 1 FROM sqlite_schema; BEGIN;",
                          0, 0, 0);
  if( p->rcErr ){
    scrubBackupErr(p,
       "cannot start a read transaction on the source database: %s",
       sqlite3_errmsg(p->dbSrc));
    return;
  }
  rc = sqlite3_wal_checkpoint_v2(p->dbSrc, "main", SQLITE_CHECKPOINT_FULL,
                                 0, 0);
  if( rc ){
    scrubBackupErr(p, "cannot checkpoint the source database");
    return;
  }
  pStmt = scrubBackupPrepare(p, p->dbSrc, "PRAGMA page_size");
  if( pStmt==0 ) return;
  rc = sqlite3_step(pStmt);
  if( rc==SQLITE_ROW ){
    p->szPage = sqlite3_column_int(pStmt, 0);
  }else{
    scrubBackupErr(p, "unable to determine the page size");
  }
  sqlite3_finalize(pStmt);
  if( p->rcErr ) return;
  pStmt = scrubBackupPrepare(p, p->dbSrc, "PRAGMA page_count");
  if( pStmt==0 ) return;
  rc = sqlite3_step(pStmt);
  if( rc==SQLITE_ROW ){
    p->nPage = sqlite3_column_int(pStmt, 0);
  }else{
    scrubBackupErr(p, "unable to determine the size of the source database");
  }
  sqlite3_finalize(pStmt);
  sqlite3_file_control(p->dbSrc, "main", SQLITE_FCNTL_FILE_POINTER, &p->pSrc);
  if( p->pSrc==0 || p->pSrc->pMethods==0 ){
    scrubBackupErr(p, "cannot get the source file handle");
    p->rcErr = SQLITE_ERROR;
  }
}

/* Create and open the destination file */
static void scrubBackupOpenDest(ScrubState *p){
  sqlite3_stmt *pStmt;
  int rc;
  char *zSql;
  if( p->rcErr ) return;
  p->rcErr = sqlite3_open_v2(p->zDestFile, &p->dbDest,
                 SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE |
                 SQLITE_OPEN_URI | SQLITE_OPEN_PRIVATECACHE, 0);
  if( p->rcErr ){
    scrubBackupErr(p, "cannot open destination database: %s",
                      sqlite3_errmsg(p->dbDest));
    return;
  }
  zSql = sqlite3_mprintf("PRAGMA page_size(%u);", p->szPage);
  if( zSql==0 ){
    p->rcErr = SQLITE_NOMEM;
    return;
  }
  p->rcErr = sqlite3_exec(p->dbDest, zSql, 0, 0, 0);
  sqlite3_free(zSql);
  if( p->rcErr ){
    scrubBackupErr(p,
       "cannot set the page size on the destination database: %s",
       sqlite3_errmsg(p->dbDest));
    return;
  }
  sqlite3_exec(p->dbDest, "PRAGMA journal_mode=OFF;", 0, 0, 0);
  p->rcErr = sqlite3_exec(p->dbDest, "BEGIN EXCLUSIVE;", 0, 0, 0);
  if( p->rcErr ){
    scrubBackupErr(p,
       "cannot start a write transaction on the destination database: %s",
       sqlite3_errmsg(p->dbDest));
    return;
  }
  pStmt = scrubBackupPrepare(p, p->dbDest, "PRAGMA page_count;");
  if( pStmt==0 ) return;
  rc = sqlite3_step(pStmt);
  if( rc!=SQLITE_ROW ){
    scrubBackupErr(p, "cannot measure the size of the destination");
  }else if( sqlite3_column_int(pStmt, 0)>1 ){
    scrubBackupErr(p, "destination database is not empty - holds %d pages",
                   sqlite3_column_int(pStmt, 0));
  }
  sqlite3_finalize(pStmt);
  sqlite3_file_control(p->dbDest, "main", SQLITE_FCNTL_FILE_POINTER, &p->pDest);
  if( p->pDest==0 || p->pDest->pMethods==0 ){
    scrubBackupErr(p, "cannot get the destination file handle");
    p->rcErr = SQLITE_ERROR;
  }
}

/* Read a 32-bit big-endian integer */
static u32 scrubBackupInt32(const u8 *a){
  u32 v = a[3];
  v += ((u32)a[2])<<8;
  v += ((u32)a[1])<<16;
  v += ((u32)a[0])<<24;
  return v;
}

/* Read a 16-bit big-endian integer */
static u32 scrubBackupInt16(const u8 *a){
  return (a[0]<<8) + a[1];
}

/*
** Read a varint.  Put the value in *pVal and return the number of bytes.
*/
static int scrubBackupVarint(const u8 *z, sqlite3_int64 *pVal){
  sqlite3_int64 v = 0;
  int i;
  for(i=0; i<8; i++){
    v = (v<<7) + (z[i]&0x7f);
    if( (z[i]&0x80)==0 ){ *pVal = v; return i+1; }
  }
  v = (v<<8) + (z[i]&0xff);
  *pVal = v;
  return 9;
}

/*
** Return the number of bytes in a varint.
*/
static int scrubBackupVarintSize(const u8 *z){
  int i;
  for(i=0; i<8; i++){
    if( (z[i]&0x80)==0 ){ return i+1; }
  }
  return 9;
}

/*
** Copy the freelist trunk page given, and all its descendents,
** zeroing out as much as possible in the process.
*/
static void scrubBackupFreelist(ScrubState *p, int pgno, u32 nFree){
  u8 *a, *aBuf;
  u32 n, mx;

  if( p->rcErr ) return;
  aBuf = scrubBackupAllocPage(p);
  if( aBuf==0 ) return;
 
  while( pgno && nFree){
    a = scrubBackupRead(p, pgno, aBuf);
    if( a==0 ) break;
    n = scrubBackupInt32(&a[4]);
    mx = p->szUsable/4 - 2;
    if( n<mx ){
      memset(&a[n*4+8], 0, 4*(mx-n));
    }
    scrubBackupWrite(p, pgno, a);
    pgno = scrubBackupInt32(a);
#if 0
    /* There is really no point in copying the freelist leaf pages.
    ** Simply leave them uninitialized in the destination database.  The
    ** OS filesystem should zero those pages for us automatically.
    */
    for(i=0; i<n && nFree; i++){
      u32 iLeaf = scrubBackupInt32(&a[i*4+8]);
      if( aZero==0 ){
        aZero = scrubBackupAllocPage(p);
        if( aZero==0 ){ pgno = 0; break; }
        memset(aZero, 0, p->szPage);
      }
      scrubBackupWrite(p, iLeaf, aZero);
      nFree--;
    }
#endif
  }
  sqlite3_free(aBuf);
}

/*
** Copy an overflow chain from source to destination.  Zero out any
** unused tail at the end of the overflow chain.
*/
static void scrubBackupOverflow(ScrubState *p, int pgno, u32 nByte){
  u8 *a, *aBuf;

  aBuf = scrubBackupAllocPage(p);
  if( aBuf==0 ) return;
  while( nByte>0 && pgno!=0 ){
    a = scrubBackupRead(p, pgno, aBuf);
    if( a==0 ) break;
    if( nByte >= (p->szUsable)-4 ){
      nByte -= (p->szUsable) - 4;
    }else{
      u32 x = (p->szUsable - 4) - nByte;
      u32 i = p->szUsable - x;
      memset(&a[i], 0, x);
      nByte = 0;
    }
    scrubBackupWrite(p, pgno, a);
    pgno = scrubBackupInt32(a);
  }
  sqlite3_free(aBuf);      
}
   

/*
** Copy B-Tree page pgno, and all of its children, from source to destination.
** Zero out deleted content during the copy.
*/
static void scrubBackupBtree(ScrubState *p, int pgno, int iDepth){
  u8 *a;
  u32 i, n, pc;
  u32 nCell;
  u32 nPrefix;
  u32 szHdr;
  u32 iChild;
  u8 *aTop;
  u8 *aCell;
  u32 x, y;
  int ln = 0;

  
  if( p->rcErr ) return;
  if( iDepth>50 ){
    scrubBackupErr(p, "corrupt: b-tree too deep at page %d", pgno);
    return;
  }
  if( pgno==1 ){
    a = p->page1;
  }else{
    a = scrubBackupRead(p, pgno, 0);
    if( a==0 ) return;
  }
  nPrefix = pgno==1 ? 100 : 0;
  aTop = &a[nPrefix];
  szHdr = 8 + 4*(aTop[0]==0x02 || aTop[0]==0x05);
  aCell = aTop + szHdr;
  nCell = scrubBackupInt16(&aTop[3]);

  /* Zero out the gap between the cell index and the start of the
  ** cell content area */
  x = scrubBackupInt16(&aTop[5]);  /* First byte of cell content area */
  if( x>p->szUsable ){ ln=__LINE__; goto btree_corrupt; }
  y = szHdr + nPrefix + nCell*2;
  if( y>x ){ ln=__LINE__; goto btree_corrupt; }
  if( y<x ) memset(a+y, 0, x-y);  /* Zero the gap */

  /* Zero out all the free blocks */  
  pc = scrubBackupInt16(&aTop[1]);
  if( pc>0 && pc<x ){ ln=__LINE__; goto btree_corrupt; }
  while( pc ){
    if( pc>(p->szUsable)-4 ){ ln=__LINE__; goto btree_corrupt; }
    n = scrubBackupInt16(&a[pc+2]);
    if( pc+n>(p->szUsable) ){ ln=__LINE__; goto btree_corrupt; }
    if( n>4 ) memset(&a[pc+4], 0, n-4);
    x = scrubBackupInt16(&a[pc]);
    if( x<pc+4 && x>0 ){ ln=__LINE__; goto btree_corrupt; }
    pc = x;
  }

  /* Write this one page */
  scrubBackupWrite(p, pgno, a);

  /* Walk the tree and process child pages */
  for(i=0; i<nCell; i++){
    u32 X, M, K, nLocal;
    sqlite3_int64 P;
    pc = scrubBackupInt16(&aCell[i*2]);
    if( pc <= szHdr ){ ln=__LINE__; goto btree_corrupt; }
    if( pc > p->szUsable-3 ){ ln=__LINE__; goto btree_corrupt; }
    if( aTop[0]==0x05 || aTop[0]==0x02 ){
      if( pc+4 > p->szUsable ){ ln=__LINE__; goto btree_corrupt; }
      iChild = scrubBackupInt32(&a[pc]);
      pc += 4;
      scrubBackupBtree(p, iChild, iDepth+1);
      if( aTop[0]==0x05 ) continue;
    }
    pc += scrubBackupVarint(&a[pc], &P);
    if( pc >= p->szUsable ){ ln=__LINE__; goto btree_corrupt; }
    if( aTop[0]==0x0d ){
      X = p->szUsable - 35;
    }else{
      X = ((p->szUsable - 12)*64/255) - 23;
    }
    if( P<=X ){
      /* All content is local.  No overflow */
      continue;
    }
    M = ((p->szUsable - 12)*32/255)-23;
    K = M + ((P-M)%(p->szUsable-4));
    if( aTop[0]==0x0d ){
      pc += scrubBackupVarintSize(&a[pc]);
      if( pc > (p->szUsable-4) ){ ln=__LINE__; goto btree_corrupt; }
    }
    nLocal = K<=X ? K : M;
    if( pc+nLocal > p->szUsable-4 ){ ln=__LINE__; goto btree_corrupt; }
    iChild = scrubBackupInt32(&a[pc+nLocal]);
    scrubBackupOverflow(p, iChild, (u32)(P-nLocal));
  }

  /* Walk the right-most tree */
  if( aTop[0]==0x05 || aTop[0]==0x02 ){
    iChild = scrubBackupInt32(&aTop[8]);
    scrubBackupBtree(p, iChild, iDepth+1);
  }

  /* All done */
  if( pgno>1 ) sqlite3_free(a);
  return;

btree_corrupt:
  scrubBackupErr(p, "corruption on page %d of source database (errid=%d)",
                 pgno, ln);
  if( pgno>1 ) sqlite3_free(a);  
}

/*
** Copy all ptrmap pages from source to destination.
** This routine is only called if the source database is in autovacuum
** or incremental vacuum mode.
*/
static void scrubBackupPtrmap(ScrubState *p){
  u32 pgno = 2;
  u32 J = p->szUsable/5;
  u32 iLock = (1073742335/p->szPage)+1;
  u8 *a, *pBuf;
  if( p->rcErr ) return;
  pBuf = scrubBackupAllocPage(p);
  if( pBuf==0 ) return;
  while( pgno<=p->nPage ){
    a = scrubBackupRead(p, pgno, pBuf);
    if( a==0 ) break;
    scrubBackupWrite(p, pgno, a);
    pgno += J+1;
    if( pgno==iLock ) pgno++;
  }
  sqlite3_free(pBuf);
}

int sqlite3_scrub_backup(
  const char *zSrcFile,    /* Source file */
  const char *zDestFile,   /* Destination file */
  char **pzErr             /* Write error here if non-NULL */
){
  ScrubState s;
  u32 n, i;
  sqlite3_stmt *pStmt;

  memset(&s, 0, sizeof(s));
  s.zSrcFile = zSrcFile;
  s.zDestFile = zDestFile;

  /* Open both source and destination databases */
  scrubBackupOpenSrc(&s);
  scrubBackupOpenDest(&s);

  /* Read in page 1 */
  s.page1 = scrubBackupRead(&s, 1, 0);
  if( s.page1==0 ) goto scrub_abort;
  s.szUsable = s.szPage - s.page1[20];

  /* Copy the freelist */    
  n = scrubBackupInt32(&s.page1[36]);
  i = scrubBackupInt32(&s.page1[32]);
  if( n ) scrubBackupFreelist(&s, i, n);

  /* Copy ptrmap pages */
  n = scrubBackupInt32(&s.page1[52]);
  if( n ) scrubBackupPtrmap(&s);

  /* Copy all of the btrees */
  scrubBackupBtree(&s, 1, 0);
  pStmt = scrubBackupPrepare(&s, s.dbSrc,
       "SELECT rootpage FROM sqlite_schema WHERE coalesce(rootpage,0)>0");
  if( pStmt==0 ) goto scrub_abort;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    i = (u32)sqlite3_column_int(pStmt, 0);
    scrubBackupBtree(&s, i, 0);
  }
  sqlite3_finalize(pStmt);

  /* If the last page of the input db file is a free-list leaf, then the
  ** backup file on disk is still smaller than the size indicated within 
  ** the database header. In this case, write a page of zeroes to the 
  ** last page of the backup database so that SQLite does not mistakenly
  ** think the db is corrupt.  */
  if( s.iLastPage<s.nPage ){
    u8 *aZero = scrubBackupAllocPage(&s);
    if( aZero ){
      memset(aZero, 0, s.szPage);
      scrubBackupWrite(&s, s.nPage, aZero);
      sqlite3_free(aZero);
    }
  }

scrub_abort:    
  /* Close the destination database without closing the transaction. If we
  ** commit, page zero will be overwritten. */
  sqlite3_close(s.dbDest);

  /* But do close out the read-transaction on the source database */
  sqlite3_exec(s.dbSrc, "COMMIT;", 0, 0, 0);
  sqlite3_close(s.dbSrc);
  sqlite3_free(s.page1);
  if( pzErr ){
    *pzErr = s.zErr;
  }else{
    sqlite3_free(s.zErr);
  }
  return s.rcErr;
}   

#ifdef SCRUB_STANDALONE
/* Error and warning log */
static void errorLogCallback(void *pNotUsed, int iErr, const char *zMsg){
  const char *zType;
  switch( iErr&0xff ){
    case SQLITE_WARNING: zType = "WARNING";  break;
    case SQLITE_NOTICE:  zType = "NOTICE";   break;
    default:             zType = "ERROR";    break;
  }
  fprintf(stderr, "%s: %s\n", zType, zMsg);
}

/* The main() routine when this utility is run as a stand-alone program */
int main(int argc, char **argv){
  char *zErr = 0;
  int rc;
  if( argc!=3 ){
    fprintf(stderr,"Usage: %s SOURCE DESTINATION\n", argv[0]);
    exit(1);
  }
  sqlite3_config(SQLITE_CONFIG_LOG, errorLogCallback, 0);
  rc = sqlite3_scrub_backup(argv[1], argv[2], &zErr);
  if( rc==SQLITE_NOMEM ){
    fprintf(stderr, "%s: out of memory\n", argv[0]);
    exit(1);
  }
  if( zErr ){
    fprintf(stderr, "%s: %s\n", argv[0], zErr);
    sqlite3_free(zErr);
    exit(1);
  }
  return 0;
}
#endif
