/*
** This program searches an SQLite database file for the lengths and
** offsets for all TEXT or BLOB entries for a particular column of a
** particular table.  The rowid, size and offset for the column are
** written to standard output.  There are three arguments, which are the
** name of the database file, the table, and the column.
*/
#include "sqlite3.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>

typedef unsigned char u8;
typedef struct GState GState;

#define ArraySize(X)   (sizeof(X)/sizeof(X[0]))

/*
** Global state information for this program.
*/
struct GState {
  char *zErr;           /* Error message text */
  FILE *f;              /* Open database file */
  int szPg;             /* Page size for the database file */
  int iRoot;            /* Root page of the table */
  int iCol;             /* Column number for the column */
  int pgno;             /* Current page number */
  u8 *aPage;            /* Current page content */
  u8 *aStack[20];       /* Page stack */
  int aPgno[20];        /* Page number stack */
  int nStack;           /* Depth of stack */
  int bTrace;           /* True for tracing output */
};

/*
** Write an error.
*/
static void ofstError(GState *p, const char *zFormat, ...){
  va_list ap;
  sqlite3_free(p->zErr);
  va_start(ap, zFormat);
  p->zErr = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
}

/*
** Write a trace message
*/
static void ofstTrace(GState *p, const char *zFormat, ...){
  va_list ap;
  if( p->bTrace ){
    va_start(ap, zFormat);
    vprintf(zFormat, ap);
    va_end(ap);
  }
}

/*
** Find the root page of the table and the column number of the column.
*/
static void ofstRootAndColumn(
  GState *p,              /* Global state */
  const char *zFile,      /* Name of the database file */
  const char *zTable,     /* Name of the table */
  const char *zColumn     /* Name of the column */
){
  sqlite3 *db = 0;
  sqlite3_stmt *pStmt = 0;
  char *zSql = 0;
  int rc;
  if( p->zErr ) return;
  rc = sqlite3_open(zFile, &db);
  if( rc ){
    ofstError(p, "cannot open database file \"%s\"", zFile);
    goto rootAndColumn_exit;
  }
  zSql = sqlite3_mprintf("SELECT rootpage FROM sqlite_schema WHERE name=%Q",
                         zTable);
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( rc ) ofstError(p, "%s: [%s]", sqlite3_errmsg(db), zSql);
  sqlite3_free(zSql);
  if( p->zErr ) goto rootAndColumn_exit;
  if( sqlite3_step(pStmt)!=SQLITE_ROW ){
    ofstError(p, "cannot find table [%s]\n", zTable);
    sqlite3_finalize(pStmt);
    goto rootAndColumn_exit;
  }
  p->iRoot = sqlite3_column_int(pStmt , 0);
  sqlite3_finalize(pStmt);

  p->iCol = -1;
  zSql = sqlite3_mprintf("PRAGMA table_info(%Q)", zTable);
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( rc ) ofstError(p, "%s: [%s}", sqlite3_errmsg(db), zSql);
  sqlite3_free(zSql);
  if( p->zErr ) goto rootAndColumn_exit;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    const char *zCol = sqlite3_column_text(pStmt, 1);
    if( strlen(zCol)==strlen(zColumn)
     && sqlite3_strnicmp(zCol, zColumn, strlen(zCol))==0
    ){
      p->iCol = sqlite3_column_int(pStmt, 0);
      break;
    }
  }
  sqlite3_finalize(pStmt);
  if( p->iCol<0 ){
    ofstError(p, "no such column: %s.%s", zTable, zColumn);
    goto rootAndColumn_exit;
  }

  zSql = sqlite3_mprintf("PRAGMA page_size");
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( rc )  ofstError(p, "%s: [%s]", sqlite3_errmsg(db), zSql);
  sqlite3_free(zSql);
  if( p->zErr ) goto rootAndColumn_exit;
  if( sqlite3_step(pStmt)!=SQLITE_ROW ){
    ofstError(p, "cannot find page size");
  }else{
    p->szPg = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);

rootAndColumn_exit:
  sqlite3_close(db);
  return;
}

/*
** Pop a page from the stack
*/
static void ofstPopPage(GState *p){
  if( p->nStack<=0 ) return;
  p->nStack--;
  sqlite3_free(p->aStack[p->nStack]);
  p->pgno = p->aPgno[p->nStack-1];
  p->aPage = p->aStack[p->nStack-1];
}


/*
** Push a new page onto the stack.
*/
static void ofstPushPage(GState *p, int pgno){
  u8 *pPage;
  size_t got;
  if( p->zErr ) return;
  if( p->nStack >= ArraySize(p->aStack) ){
    ofstError(p, "page stack overflow");
    return;
  }
  p->aPgno[p->nStack] = pgno;
  p->aStack[p->nStack] = pPage = sqlite3_malloc( p->szPg );
  if( pPage==0 ){
    fprintf(stderr, "out of memory\n");
    exit(1);
  }
  p->nStack++;
  p->aPage = pPage;
  p->pgno = pgno;
  fseek(p->f, (pgno-1)*p->szPg, SEEK_SET);
  got = fread(pPage, 1, p->szPg, p->f);
  if( got!=p->szPg ){
    ofstError(p, "unable to read page %d", pgno);
    ofstPopPage(p);
  }
}

/* Read a two-byte integer at the given offset into the current page */
static int ofst2byte(GState *p, int ofst){
  int x = p->aPage[ofst];
  return (x<<8) + p->aPage[ofst+1];
}

/* Read a four-byte integer at the given offset into the current page */
static int ofst4byte(GState *p, int ofst){
  int x = p->aPage[ofst];
  x = (x<<8) + p->aPage[ofst+1];
  x = (x<<8) + p->aPage[ofst+2];
  x = (x<<8) + p->aPage[ofst+3];
  return x;
}

/* Read a variable-length integer.  Update the offset */
static sqlite3_int64 ofstVarint(GState *p, int *pOfst){
  sqlite3_int64 x = 0;
  u8 *a = &p->aPage[*pOfst];
  int n = 0;
  while( n<8 && (a[0] & 0x80)!=0 ){
    x = (x<<7) + (a[0] & 0x7f);
    n++;
    a++;
  }
  if( n==8 ){
    x = (x<<8) + a[0];
  }else{
    x = (x<<7) + a[0];
  }
  *pOfst += (n+1);
  return x;
}

/* Return the absolute offset into a file for the given offset
** into the current page */
static int ofstInFile(GState *p, int ofst){
  return p->szPg*(p->pgno-1) + ofst;
}

/* Return the size (in bytes) of the data corresponding to the
** given serial code */
static int ofstSerialSize(int scode){
  if( scode<5 ) return scode;
  if( scode==5 ) return 6;
  if( scode<8 ) return 8;
  if( scode<12 ) return 0;
  return (scode-12)/2;
}

/* Forward reference */
static void ofstWalkPage(GState*, int);

/* Walk an interior btree page */
static void ofstWalkInteriorPage(GState *p){
  int nCell;
  int i;
  int ofst;
  int iChild;

  nCell = ofst2byte(p, 3);
  for(i=0; i<nCell; i++){
    ofst = ofst2byte(p, 12+i*2);
    iChild = ofst4byte(p, ofst);
    ofstWalkPage(p, iChild);
    if( p->zErr ) return;
  }
  ofstWalkPage(p, ofst4byte(p, 8));
}

/* Walk a leaf btree page */
static void ofstWalkLeafPage(GState *p){
  int nCell;
  int i;
  int ofst;
  int nPayload;
  sqlite3_int64 rowid;
  int nHdr;
  int j;
  int scode;
  int sz;
  int dataOfst;
  char zMsg[200];

  nCell = ofst2byte(p, 3);
  for(i=0; i<nCell; i++){
    ofst = ofst2byte(p, 8+i*2);
    nPayload = ofstVarint(p, &ofst);
    rowid = ofstVarint(p, &ofst);
    if( nPayload > p->szPg-35 ){
      sqlite3_snprintf(sizeof(zMsg), zMsg,
         "# overflow rowid %lld", rowid);
      printf("%s\n", zMsg);
      continue;
    }
    dataOfst = ofst;
    nHdr = ofstVarint(p, &ofst);
    dataOfst += nHdr;
    for(j=0; j<p->iCol; j++){
      scode = ofstVarint(p, &ofst);
      dataOfst += ofstSerialSize(scode);
    }
    scode = ofstVarint(p, &ofst);
    sz = ofstSerialSize(scode);
    sqlite3_snprintf(sizeof(zMsg), zMsg,
         "rowid %12lld size %5d offset %8d",
          rowid, sz, ofstInFile(p, dataOfst));
    printf("%s\n", zMsg);
  }
}

/*
** Output results from a single page.
*/
static void ofstWalkPage(GState *p, int pgno){
  if( p->zErr ) return;
  ofstPushPage(p, pgno);
  if( p->zErr ) return;
  if( p->aPage[0]==5 ){
    ofstWalkInteriorPage(p);
  }else if( p->aPage[0]==13 ){
    ofstWalkLeafPage(p);
  }else{
    ofstError(p, "page %d has a faulty type byte: %d", pgno, p->aPage[0]);
  }
  ofstPopPage(p);
}

int main(int argc, char **argv){
  GState g;
  memset(&g, 0, sizeof(g));
  if( argc>2 && strcmp(argv[1],"--trace")==0 ){
    g.bTrace = 1;
    argc--;
    argv++;
  }
  if( argc!=4 ){
    fprintf(stderr, "Usage: %s DATABASE TABLE COLUMN\n", *argv);
    exit(1);
  }
  ofstRootAndColumn(&g, argv[1], argv[2], argv[3]);
  if( g.zErr ){
    fprintf(stderr, "%s\n", g.zErr);
    exit(1);
  }
  ofstTrace(&g, "# szPg = %d\n", g.szPg);
  ofstTrace(&g, "# iRoot = %d\n", g.iRoot);
  ofstTrace(&g, "# iCol = %d\n", g.iCol);
  g.f = fopen(argv[1], "rb");
  if( g.f==0 ){
    fprintf(stderr, "cannot open \"%s\"\n", argv[1]);
    exit(1);
  }
  ofstWalkPage(&g, g.iRoot);
  if( g.zErr ){
    fprintf(stderr, "%s\n", g.zErr);
    exit(1);
  }
  return 0; 
}
