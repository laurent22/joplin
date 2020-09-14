/*
** A utility for printing all or part of an SQLite database file.
*/
#include <stdio.h>
#include <ctype.h>
#define ISDIGIT(X) isdigit((unsigned char)(X))
#define ISPRINT(X) isprint((unsigned char)(X))
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

#if !defined(_MSC_VER)
#include <unistd.h>
#else
#include <io.h>
#endif

#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "sqlite3.h"

typedef unsigned char u8;         /* unsigned 8-bit */
typedef unsigned int u32;         /* unsigned 32-bit */
typedef sqlite3_int64 i64;        /* signed 64-bit */
typedef sqlite3_uint64 u64;       /* unsigned 64-bit */


static struct GlobalData {
  u32 pagesize;                   /* Size of a database page */
  int dbfd;                       /* File descriptor for reading the DB */
  u32 mxPage;                     /* Last page number */
  int perLine;                    /* HEX elements to print per line */
  int bRaw;                       /* True to access db file via OS APIs */
  sqlite3_file *pFd;              /* File descriptor for non-raw mode */
  sqlite3 *pDb;                   /* Database handle that owns pFd */
} g = {1024, -1, 0, 16,   0, 0, 0};

/*
** Convert the var-int format into i64.  Return the number of bytes
** in the var-int.  Write the var-int value into *pVal.
*/
static int decodeVarint(const unsigned char *z, i64 *pVal){
  i64 v = 0;
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
** Extract a big-endian 32-bit integer
*/
static u32 decodeInt32(const u8 *z){
  return (z[0]<<24) + (z[1]<<16) + (z[2]<<8) + z[3];
}

/* Report an out-of-memory error and die.
*/
static void out_of_memory(void){
  fprintf(stderr,"Out of memory...\n");
  exit(1);
}

/*
** Open a database connection.
*/
static sqlite3 *openDatabase(const char *zPrg, const char *zName){
  sqlite3 *db = 0;
  int flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_URI;
  int rc = sqlite3_open_v2(zName, &db, flags, 0);
  if( rc!=SQLITE_OK ){
    const char *zErr = sqlite3_errmsg(db);
    fprintf(stderr, "%s: can't open %s (%s)\n", zPrg, zName, zErr);
    sqlite3_close(db);
    exit(1);
  }
  return db;
}

/**************************************************************************
** Beginning of low-level file access functions.
**
** All low-level access to the database file read by this program is
** performed using the following four functions:
**
**   fileOpen()     - open the db file
**   fileClose()    - close the db file
**   fileRead()     - read raw data from the db file
**   fileGetsize()  - return the size of the db file in bytes
*/

/*
** Open the database file.
*/
static void fileOpen(const char *zPrg, const char *zName){
  assert( g.dbfd<0 );
  if( g.bRaw==0 ){
    int rc;
    void *pArg = (void *)(&g.pFd);
    g.pDb = openDatabase(zPrg, zName);
    rc = sqlite3_file_control(g.pDb, "main", SQLITE_FCNTL_FILE_POINTER, pArg);
    if( rc!=SQLITE_OK ){
      fprintf(stderr, 
          "%s: failed to obtain fd for %s (SQLite too old?)\n", zPrg, zName
      );
      exit(1);
    }
  }else{
    g.dbfd = open(zName, O_RDONLY);
    if( g.dbfd<0 ){
      fprintf(stderr,"%s: can't open %s\n", zPrg, zName);
      exit(1);
    }
  }
}

/*
** Close the database file opened by fileOpen()
*/
static void fileClose(){
  if( g.bRaw==0 ){
    sqlite3_close(g.pDb);
    g.pDb = 0;
    g.pFd = 0;
  }else{
    close(g.dbfd);
    g.dbfd = -1;
  }
}

/*
** Read content from the file.
**
** Space to hold the content is obtained from sqlite3_malloc() and needs 
** to be freed by the caller.
*/
static unsigned char *fileRead(sqlite3_int64 ofst, int nByte){
  unsigned char *aData;
  int got;
  aData = sqlite3_malloc64(32+(i64)nByte);
  if( aData==0 ) out_of_memory();
  memset(aData, 0, nByte+32);
  if( g.bRaw==0 ){
    int rc = g.pFd->pMethods->xRead(g.pFd, (void*)aData, nByte, ofst);
    if( rc!=SQLITE_OK && rc!=SQLITE_IOERR_SHORT_READ ){
      fprintf(stderr, "error in xRead() - %d\n", rc);
      exit(1);
    }
  }else{
    lseek(g.dbfd, (long)ofst, SEEK_SET);
    got = read(g.dbfd, aData, nByte);
    if( got>0 && got<nByte ) memset(aData+got, 0, nByte-got);
  }
  return aData;
}

/*
** Return the size of the file in byte.
*/
static i64 fileGetsize(void){
  i64 res = 0;
  if( g.bRaw==0 ){
    int rc = g.pFd->pMethods->xFileSize(g.pFd, &res);
    if( rc!=SQLITE_OK ){
      fprintf(stderr, "error in xFileSize() - %d\n", rc);
      exit(1);
    }
  }else{
    struct stat sbuf;
    fstat(g.dbfd, &sbuf);
    res = (sqlite3_int64)(sbuf.st_size);
  }
  return res;
}

/*
** End of low-level file access functions.
**************************************************************************/

/*
** Print a range of bytes as hex and as ascii.
*/
static unsigned char *print_byte_range(
  sqlite3_int64 ofst,  /* First byte in the range of bytes to print */
  int nByte,           /* Number of bytes to print */
  int printOfst        /* Add this amount to the index on the left column */
){
  unsigned char *aData;
  int i, j;
  const char *zOfstFmt;

  if( ((printOfst+nByte)&~0xfff)==0 ){
    zOfstFmt = " %03x: ";
  }else if( ((printOfst+nByte)&~0xffff)==0 ){
    zOfstFmt = " %04x: ";
  }else if( ((printOfst+nByte)&~0xfffff)==0 ){
    zOfstFmt = " %05x: ";
  }else if( ((printOfst+nByte)&~0xffffff)==0 ){
    zOfstFmt = " %06x: ";
  }else{
    zOfstFmt = " %08x: ";
  }

  aData = fileRead(ofst, nByte);
  for(i=0; i<nByte; i += g.perLine){
    int go = 0;
    for(j=0; j<g.perLine; j++){
      if( i+j>nByte ){ break; }
      if( aData[i+j] ){ go = 1; break; }
    }
    if( !go && i>0 && i+g.perLine<nByte ) continue;
    fprintf(stdout, zOfstFmt, i+printOfst);
    for(j=0; j<g.perLine; j++){
      if( i+j>nByte ){
        fprintf(stdout, "   ");
      }else{
        fprintf(stdout,"%02x ", aData[i+j]);
      }
    }
    for(j=0; j<g.perLine; j++){
      if( i+j>nByte ){
        fprintf(stdout, " ");
      }else{
        fprintf(stdout,"%c", ISPRINT(aData[i+j]) ? aData[i+j] : '.');
      }
    }
    fprintf(stdout,"\n");
  }
  return aData;
}

/*
** Print an entire page of content as hex
*/
static void print_page(u32 iPg){
  i64 iStart;
  unsigned char *aData;
  iStart = ((i64)(iPg-1))*g.pagesize;
  fprintf(stdout, "Page %u:   (offsets 0x%llx..0x%llx)\n",
          iPg, iStart, iStart+g.pagesize-1);
  aData = print_byte_range(iStart, g.pagesize, 0);
  sqlite3_free(aData);
}


/* Print a line of decoded output showing a 4-byte unsigned integer.
*/
static void print_decode_line(
  unsigned char *aData,      /* Content being decoded */
  int ofst, int nByte,       /* Start and size of decode */
  const char *zMsg           /* Message to append */
){
  int i, j;
  u32 val = aData[ofst];
  char zBuf[100];
  sprintf(zBuf, " %03x: %02x", ofst, aData[ofst]);
  i = (int)strlen(zBuf);
  for(j=1; j<4; j++){
    if( j>=nByte ){
      sprintf(&zBuf[i], "   ");
    }else{
      sprintf(&zBuf[i], " %02x", aData[ofst+j]);
      val = val*256 + aData[ofst+j];
    }
    i += (int)strlen(&zBuf[i]);
  }
  sprintf(&zBuf[i], "   %10u", val);
  printf("%s  %s\n", zBuf, zMsg);
}

/*
** Decode the database header.
*/
static void print_db_header(void){
  unsigned char *aData;
  aData = print_byte_range(0, 100, 0);
  printf("Decoded:\n");
  print_decode_line(aData, 16, 2, "Database page size");
  print_decode_line(aData, 18, 1, "File format write version");
  print_decode_line(aData, 19, 1, "File format read version");
  print_decode_line(aData, 20, 1, "Reserved space at end of page");
  print_decode_line(aData, 24, 4, "File change counter");
  print_decode_line(aData, 28, 4, "Size of database in pages");
  print_decode_line(aData, 32, 4, "Page number of first freelist page");
  print_decode_line(aData, 36, 4, "Number of freelist pages");
  print_decode_line(aData, 40, 4, "Schema cookie");
  print_decode_line(aData, 44, 4, "Schema format version");
  print_decode_line(aData, 48, 4, "Default page cache size");
  print_decode_line(aData, 52, 4, "Largest auto-vac root page");
  print_decode_line(aData, 56, 4, "Text encoding");
  print_decode_line(aData, 60, 4, "User version");
  print_decode_line(aData, 64, 4, "Incremental-vacuum mode");
  print_decode_line(aData, 68, 4, "Application ID");
  print_decode_line(aData, 72, 4, "meta[8]");
  print_decode_line(aData, 76, 4, "meta[9]");
  print_decode_line(aData, 80, 4, "meta[10]");
  print_decode_line(aData, 84, 4, "meta[11]");
  print_decode_line(aData, 88, 4, "meta[12]");
  print_decode_line(aData, 92, 4, "Change counter for version number");
  print_decode_line(aData, 96, 4, "SQLite version number");
  sqlite3_free(aData);
}

/*
** Describe cell content.
*/
static i64 describeContent(
  unsigned char *a,       /* Cell content */
  i64 nLocal,             /* Bytes in a[] */
  char *zDesc             /* Write description here */
){
  i64 nDesc = 0;
  int n, j;
  i64 i, x, v;
  const unsigned char *pData;
  const unsigned char *pLimit;
  char sep = ' ';

  pLimit = &a[nLocal];
  n = decodeVarint(a, &x);
  pData = &a[x];
  a += n;
  i = x - n;
  while( i>0 && pData<=pLimit ){
    n = decodeVarint(a, &x);
    a += n;
    i -= n;
    nLocal -= n;
    zDesc[0] = sep;
    sep = ',';
    nDesc++;
    zDesc++;
    if( x==0 ){
      sprintf(zDesc, "*");     /* NULL is a "*" */
    }else if( x>=1 && x<=6 ){
      v = (signed char)pData[0];
      pData++;
      switch( x ){
        case 6:  v = (v<<16) + (pData[0]<<8) + pData[1];  pData += 2;
        case 5:  v = (v<<16) + (pData[0]<<8) + pData[1];  pData += 2;
        case 4:  v = (v<<8) + pData[0];  pData++;
        case 3:  v = (v<<8) + pData[0];  pData++;
        case 2:  v = (v<<8) + pData[0];  pData++;
      }
      sprintf(zDesc, "%lld", v);
    }else if( x==7 ){
      sprintf(zDesc, "real");
      pData += 8;
    }else if( x==8 ){
      sprintf(zDesc, "0");
    }else if( x==9 ){
      sprintf(zDesc, "1");
    }else if( x>=12 ){
      i64 size = (x-12)/2;
      if( (x&1)==0 ){
        sprintf(zDesc, "blob(%lld)", size);
      }else{
        sprintf(zDesc, "txt(%lld)", size);
      }
      pData += size;
    }
    j = (int)strlen(zDesc);
    zDesc += j;
    nDesc += j;
  }
  return nDesc;
}

/*
** Compute the local payload size given the total payload size and
** the page size.
*/
static i64 localPayload(i64 nPayload, char cType){
  i64 maxLocal;
  i64 minLocal;
  i64 surplus;
  i64 nLocal;
  if( cType==13 ){
    /* Table leaf */
    maxLocal = g.pagesize-35;
    minLocal = (g.pagesize-12)*32/255-23;
  }else{
    maxLocal = (g.pagesize-12)*64/255-23;
    minLocal = (g.pagesize-12)*32/255-23;
  }
  if( nPayload>maxLocal ){
    surplus = minLocal + (nPayload-minLocal)%(g.pagesize-4);
    if( surplus<=maxLocal ){
      nLocal = surplus;
    }else{
      nLocal = minLocal;
    }
  }else{
    nLocal = nPayload;
  }
  return nLocal;
}
  

/*
** Create a description for a single cell.
**
** The return value is the local cell size.
*/
static i64 describeCell(
  unsigned char cType,    /* Page type */
  unsigned char *a,       /* Cell content */
  int showCellContent,    /* Show cell content if true */
  char **pzDesc           /* Store description here */
){
  int i;
  i64 nDesc = 0;
  int n = 0;
  u32 leftChild;
  i64 nPayload;
  i64 rowid;
  i64 nLocal;
  static char zDesc[1000];
  i = 0;
  if( cType<=5 ){
    leftChild = ((a[0]*256 + a[1])*256 + a[2])*256 + a[3];
    a += 4;
    n += 4;
    sprintf(zDesc, "lx: %u ", leftChild);
    nDesc = strlen(zDesc);
  }
  if( cType!=5 ){
    i = decodeVarint(a, &nPayload);
    a += i;
    n += i;
    sprintf(&zDesc[nDesc], "n: %lld ", nPayload);
    nDesc += strlen(&zDesc[nDesc]);
    nLocal = localPayload(nPayload, cType);
  }else{
    nPayload = nLocal = 0;
  }
  if( cType==5 || cType==13 ){
    i = decodeVarint(a, &rowid);
    a += i;
    n += i;
    sprintf(&zDesc[nDesc], "r: %lld ", rowid);
    nDesc += strlen(&zDesc[nDesc]);
  }
  if( nLocal<nPayload ){
    u32 ovfl;
    unsigned char *b = &a[nLocal];
    ovfl = ((b[0]*256 + b[1])*256 + b[2])*256 + b[3];
    sprintf(&zDesc[nDesc], "ov: %u ", ovfl);
    nDesc += strlen(&zDesc[nDesc]);
    n += 4;
  }
  if( showCellContent && cType!=5 ){
    nDesc += describeContent(a, nLocal, &zDesc[nDesc-1]);
  }
  *pzDesc = zDesc;
  return nLocal+n;
}

/* Print an offset followed by nByte bytes.  Add extra white-space
** at the end so that subsequent text is aligned.
*/
static void printBytes(
  unsigned char *aData,      /* Content being decoded */
  unsigned char *aStart,     /* Start of content to be printed */
  int nByte                  /* Number of bytes to print */
){
  int j;
  printf(" %03x: ", (int)(aStart-aData));
  for(j=0; j<9; j++){
    if( j>=nByte ){
      printf("   ");
    }else{
      printf("%02x ", aStart[j]);
    }
  }
}


/*
** Write a full decode on stdout for the cell at a[ofst].
** Assume the page contains a header of size szPgHdr bytes.
*/
static void decodeCell(
  unsigned char *a,       /* Page content (without the page-1 header) */
  unsigned pgno,          /* Page number */
  int iCell,              /* Cell index */
  int szPgHdr,            /* Size of the page header.  0 or 100 */
  int ofst                /* Cell begins at a[ofst] */
){
  int i, j = 0;
  u32 leftChild;
  i64 k;
  i64 nPayload;
  i64 rowid;
  i64 nHdr;
  i64 iType;
  i64 nLocal;
  unsigned char *x = a + ofst;
  unsigned char *end;
  unsigned char cType = a[0];
  int nCol = 0;
  int szCol[2000];
  int ofstCol[2000];
  int typeCol[2000];

  printf("Cell[%d]:\n", iCell);
  if( cType<=5 ){
    leftChild = ((x[0]*256 + x[1])*256 + x[2])*256 + x[3];
    printBytes(a, x, 4);
    printf("left child page:: %u\n", leftChild);
    x += 4;
  }
  if( cType!=5 ){
    i = decodeVarint(x, &nPayload);
    printBytes(a, x, i);
    nLocal = localPayload(nPayload, cType);
    if( nLocal==nPayload ){
      printf("payload-size: %lld\n", nPayload);
    }else{
      printf("payload-size: %lld (%lld local, %lld overflow)\n",
             nPayload, nLocal, nPayload-nLocal);
    }
    x += i;
  }else{
    nPayload = nLocal = 0;
  }
  end = x + nLocal;
  if( cType==5 || cType==13 ){
    i = decodeVarint(x, &rowid);
    printBytes(a, x, i);
    printf("rowid: %lld\n", rowid);
    x += i;
  }
  if( nLocal>0 ){
    i = decodeVarint(x, &nHdr);
    printBytes(a, x, i);
    printf("record-header-size: %d\n", (int)nHdr);
    j = i;
    nCol = 0;
    k = nHdr;
    while( x+j<=end && j<nHdr ){
       const char *zTypeName;
       int sz = 0;
       char zNm[30];
       i = decodeVarint(x+j, &iType);
       printBytes(a, x+j, i);
       printf("typecode[%d]: %d - ", nCol, (int)iType);
       switch( iType ){
         case 0:  zTypeName = "NULL";    sz = 0;  break;
         case 1:  zTypeName = "int8";    sz = 1;  break;
         case 2:  zTypeName = "int16";   sz = 2;  break;
         case 3:  zTypeName = "int24";   sz = 3;  break;
         case 4:  zTypeName = "int32";   sz = 4;  break;
         case 5:  zTypeName = "int48";   sz = 6;  break;
         case 6:  zTypeName = "int64";   sz = 8;  break;
         case 7:  zTypeName = "double";  sz = 8;  break;
         case 8:  zTypeName = "zero";    sz = 0;  break;
         case 9:  zTypeName = "one";     sz = 0;  break;
         case 10:
         case 11: zTypeName = "error";   sz = 0;  break;
         default: {
           sz = (int)(iType-12)/2;
           sprintf(zNm, (iType&1)==0 ? "blob(%d)" : "text(%d)", sz);
           zTypeName = zNm;
           break;
         }
       }
       printf("%s\n", zTypeName);
       szCol[nCol] = sz;
       ofstCol[nCol] = (int)k;
       typeCol[nCol] = (int)iType;
       k += sz;
       nCol++;
       j += i;
    }
    for(i=0; i<nCol && ofstCol[i]+szCol[i]<=nLocal; i++){
       int s = ofstCol[i];
       i64 v;
       const unsigned char *pData;
       if( szCol[i]==0 ) continue;
       printBytes(a, x+s, szCol[i]);
       printf("data[%d]: ", i);
       pData = x+s;
       if( typeCol[i]<=7 ){
         v = (signed char)pData[0];
         for(k=1; k<szCol[i]; k++){
           v = (v<<8) + pData[k];
         }
         if( typeCol[i]==7 ){
           double r;
           memcpy(&r, &v, sizeof(r));
           printf("%#g\n", r);
         }else{
           printf("%lld\n", v);
         }
       }else{
         int ii, jj;
         char zConst[32];
         if( (typeCol[i]&1)==0 ){
           zConst[0] = 'x';
           zConst[1] = '\'';
           for(ii=2, jj=0; jj<szCol[i] && ii<24; jj++, ii+=2){
             sprintf(zConst+ii, "%02x", pData[jj]);
           }
         }else{
           zConst[0] = '\'';
           for(ii=1, jj=0; jj<szCol[i] && ii<24; jj++, ii++){
             zConst[ii] = ISPRINT(pData[jj]) ? pData[jj] : '.';
           }
           zConst[ii] = 0;
         }
         if( jj<szCol[i] ){
           memcpy(zConst+ii, "...'", 5);
         }else{
           memcpy(zConst+ii, "'", 2);
         }
         printf("%s\n", zConst);
       }
       j = ofstCol[i] + szCol[i];
    }
  }
  if( j<nLocal ){
    printBytes(a, x+j, 0);
    printf("... %lld bytes of content ...\n", nLocal-j);
  }
  if( nLocal<nPayload ){
    printBytes(a, x+nLocal, 4);
    printf("overflow-page: %u\n", decodeInt32(x+nLocal));
  }
}


/*
** Decode a btree page
*/
static void decode_btree_page(
  unsigned char *a,   /* Page content */
  int pgno,           /* Page number */
  int hdrSize,        /* Size of the page header.  0 or 100 */
  char *zArgs         /* Flags to control formatting */
){
  const char *zType = "unknown";
  int nCell;
  int i, j;
  int iCellPtr;
  int showCellContent = 0;
  int showMap = 0;
  int cellToDecode = -2;
  char *zMap = 0;
  switch( a[0] ){
    case 2:  zType = "index interior node";  break;
    case 5:  zType = "table interior node";  break;
    case 10: zType = "index leaf";           break;
    case 13: zType = "table leaf";           break;
  }
  while( zArgs[0] ){
    switch( zArgs[0] ){
      case 'c': showCellContent = 1;  break;
      case 'm': showMap = 1;          break;
      case 'd': {
        if( !ISDIGIT(zArgs[1]) ){
          cellToDecode = -1;
        }else{
          cellToDecode = 0;
          while( ISDIGIT(zArgs[1]) ){
            zArgs++;
            cellToDecode = cellToDecode*10 + zArgs[0] - '0';
          }
        }
        break;
      }
    }
    zArgs++;
  }
  nCell = a[3]*256 + a[4];
  iCellPtr = (a[0]==2 || a[0]==5) ? 12 : 8;
  if( cellToDecode>=nCell ){
    printf("Page %d has only %d cells\n", pgno, nCell);
    return;
  }
  printf("Header on btree page %d:\n", pgno);
  print_decode_line(a, 0, 1, zType);
  print_decode_line(a, 1, 2, "Offset to first freeblock");
  print_decode_line(a, 3, 2, "Number of cells on this page");
  print_decode_line(a, 5, 2, "Offset to cell content area");
  print_decode_line(a, 7, 1, "Fragmented byte count");
  if( a[0]==2 || a[0]==5 ){
    print_decode_line(a, 8, 4, "Right child");
  }
  if( cellToDecode==(-2) && nCell>0 ){
    printf(" key: lx=left-child n=payload-size r=rowid\n");
  }
  if( showMap ){
    zMap = sqlite3_malloc(g.pagesize);
    memset(zMap, '.', g.pagesize);
    memset(zMap, '1', hdrSize);
    memset(&zMap[hdrSize], 'H', iCellPtr);
    memset(&zMap[hdrSize+iCellPtr], 'P', 2*nCell);
  }
  for(i=0; i<nCell; i++){
    int cofst = iCellPtr + i*2;
    char *zDesc;
    i64 n;

    cofst = a[cofst]*256 + a[cofst+1];
    n = describeCell(a[0], &a[cofst-hdrSize], showCellContent, &zDesc);
    if( showMap ){
      char zBuf[30];
      memset(&zMap[cofst], '*', (size_t)n);
      zMap[cofst] = '[';
      zMap[cofst+n-1] = ']';
      sprintf(zBuf, "%d", i);
      j = (int)strlen(zBuf);
      if( j<=n-2 ) memcpy(&zMap[cofst+1], zBuf, j);
    }
    if( cellToDecode==(-2) ){
      printf(" %03x: cell[%d] %s\n", cofst, i, zDesc);
    }else if( cellToDecode==(-1) || cellToDecode==i ){
      decodeCell(a, pgno, i, hdrSize, cofst-hdrSize);
    }
  }
  if( showMap ){
    printf("Page map:  (H=header P=cell-index 1=page-1-header .=free-space)\n");
    for(i=0; i<g.pagesize; i+=64){
      printf(" %03x: %.64s\n", i, &zMap[i]);
    }
    sqlite3_free(zMap);
  }
}

/*
** Decode a freelist trunk page.
*/
static void decode_trunk_page(
  u32 pgno,             /* The page number */
  int detail,           /* Show leaf pages if true */
  int recursive         /* Follow the trunk change if true */
){
  u32 i;
  u32 n;
  unsigned char *a;
  while( pgno>0 ){
    a = fileRead((pgno-1)*g.pagesize, g.pagesize);
    printf("Decode of freelist trunk page %d:\n", pgno);
    print_decode_line(a, 0, 4, "Next freelist trunk page");
    print_decode_line(a, 4, 4, "Number of entries on this page");
    if( detail ){
      n = decodeInt32(&a[4]);
      for(i=0; i<n && i<g.pagesize/4; i++){
        u32 x = decodeInt32(&a[8+4*i]);
        char zIdx[10];
        sprintf(zIdx, "[%d]", i);
        printf("  %5s %7u", zIdx, x);
        if( i%5==4 ) printf("\n");
      }
      if( i%5!=0 ) printf("\n");
    }
    if( !recursive ){
      pgno = 0;
    }else{
      pgno = decodeInt32(&a[0]);
    }
    sqlite3_free(a);
  }
}

/*
** A short text comment on the use of each page.
*/
static char **zPageUse;

/*
** Add a comment on the use of a page.
*/
static void page_usage_msg(u32 pgno, const char *zFormat, ...){
  va_list ap;
  char *zMsg;

  va_start(ap, zFormat);
  zMsg = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( pgno<=0 || pgno>g.mxPage ){
    printf("ERROR: page %d out of range 1..%u: %s\n",
            pgno, g.mxPage, zMsg);
    sqlite3_free(zMsg);
    return;
  }
  if( zPageUse[pgno]!=0 ){
    printf("ERROR: page %d used multiple times:\n", pgno);
    printf("ERROR:    previous: %s\n", zPageUse[pgno]);
    printf("ERROR:    current:  %s\n", zMsg);
    sqlite3_free(zPageUse[pgno]);
  }
  zPageUse[pgno] = zMsg;
}

/*
** Find overflow pages of a cell and describe their usage.
*/
static void page_usage_cell(
  unsigned char cType,    /* Page type */
  unsigned char *a,       /* Cell content */
  u32 pgno,               /* page containing the cell */
  int cellno              /* Index of the cell on the page */
){
  int i;
  int n = 0;
  i64 nPayload;
  i64 rowid;
  i64 nLocal;
  i = 0;
  if( cType<=5 ){
    a += 4;
    n += 4;
  }
  if( cType!=5 ){
    i = decodeVarint(a, &nPayload);
    a += i;
    n += i;
    nLocal = localPayload(nPayload, cType);
  }else{
    nPayload = nLocal = 0;
  }
  if( cType==5 || cType==13 ){
    i = decodeVarint(a, &rowid);
    a += i;
    n += i;
  }
  if( nLocal<nPayload ){
    u32 ovfl = decodeInt32(a+nLocal);
    u32 cnt = 0;
    while( ovfl && (cnt++)<g.mxPage ){
      page_usage_msg(ovfl, "overflow %d from cell %d of page %u",
                     cnt, cellno, pgno);
      a = fileRead((ovfl-1)*(sqlite3_int64)g.pagesize, 4);
      ovfl = decodeInt32(a);
      sqlite3_free(a);
    }
  }
}

/*
** True if the memory is all zeros
*/
static int allZero(unsigned char *a, int n){
  while( n && (a++)[0]==0 ){ n--; }
  return n==0;
}


/*
** Describe the usages of a b-tree page.
**
** If parent==0, then this is the root of a btree.  If parent<0 then
** this is an orphan page.
*/
static void page_usage_btree(
  u32 pgno,             /* Page to describe */
  u32 parent,           /* Parent of this page.  0 for root pages */
  int idx,              /* Which child of the parent */
  const char *zName     /* Name of the table */
){
  unsigned char *a;
  const char *zType = "corrupt node";
  int nCell;
  int i;
  int hdr = pgno==1 ? 100 : 0;
  char zEntry[30];

  if( pgno<=0 || pgno>g.mxPage ) return;
  a = fileRead((pgno-1)*g.pagesize, g.pagesize);
  switch( a[hdr] ){
    case 0: {
      if( allZero(a, g.pagesize) ){
        zType = "zeroed page";
      }else if( parent<0 ){
        return;
      }else{
        zType = "corrupt node";
      }
      break;
    }
    case 2:  zType = "interior node of index";  break;
    case 5:  zType = "interior node of table";  break;
    case 10: zType = "leaf of index";           break;
    case 13: zType = "leaf of table";           break;
    default: {
      if( parent<0 ) return;
      zType = "corrupt node";
    }
  }
  nCell = a[hdr+3]*256 + a[hdr+4];
  if( nCell==1 ){
    sqlite3_snprintf(sizeof(zEntry),zEntry,"1 row");
  }else{
    sqlite3_snprintf(sizeof(zEntry),zEntry,"%d rows", nCell);
  }
  if( parent>0 ){
    page_usage_msg(pgno, "%s [%s], child %d of page %d, %s",
                   zType, zName, idx, parent, zEntry);
  }else if( parent==0 ){
    page_usage_msg(pgno, "root %s [%s], %s", zType, zName, zEntry);
  }else{
    page_usage_msg(pgno, "orphaned %s, %s", zType, zEntry);
  }
  if( a[hdr]==2 || a[hdr]==5 ){
    int cellstart = hdr+12;
    u32 child;
    for(i=0; i<nCell; i++){
      u32 ofst;

      ofst = cellstart + i*2;
      ofst = a[ofst]*256 + a[ofst+1];
      child = decodeInt32(a+ofst);
      page_usage_btree(child, pgno, i, zName);
    }
    child = decodeInt32(a+cellstart-4);
    page_usage_btree(child, pgno, i, zName);
  }
  if( a[hdr]==2 || a[hdr]==10 || a[hdr]==13 ){
    int cellstart = hdr + 8 + 4*(a[hdr]<=5);
    for(i=0; i<nCell; i++){
      int ofst;
      ofst = cellstart + i*2;
      ofst = a[ofst]*256 + a[ofst+1];
      page_usage_cell(a[hdr], a+ofst, pgno, i);
    }
  }
  sqlite3_free(a);
}

/*
** Determine page usage by the freelist
*/
static void page_usage_freelist(u32 pgno){
  unsigned char *a;
  int cnt = 0;
  int i;
  int n;
  int iNext;
  int parent = 1;

  while( pgno>0 && pgno<=g.mxPage && (cnt++)<g.mxPage ){
    page_usage_msg(pgno, "freelist trunk #%d child of %d", cnt, parent);
    a = fileRead((pgno-1)*g.pagesize, g.pagesize);
    iNext = decodeInt32(a);
    n = decodeInt32(a+4);
    for(i=0; i<n; i++){
      int child = decodeInt32(a + (i*4+8));
      page_usage_msg(child, "freelist leaf, child %d of trunk page %d",
                     i, pgno);
    }
    sqlite3_free(a);
    parent = pgno;
    pgno = iNext;
  }
}

/*
** Determine pages used as PTRMAP pages
*/
static void page_usage_ptrmap(u8 *a){
  if( decodeInt32(a+52) ){
    int usable = g.pagesize - a[20];
    u64 pgno = 2;
    int perPage = usable/5;
    while( pgno<=g.mxPage ){
      page_usage_msg((u32)pgno, "PTRMAP page covering %llu..%llu",
                           pgno+1, pgno+perPage);
      pgno += perPage + 1;
    }
  }
}

/*
** Try to figure out how every page in the database file is being used.
*/
static void page_usage_report(const char *zPrg, const char *zDbName){
  u32 i, j;
  int rc;
  sqlite3 *db;
  sqlite3_stmt *pStmt;
  unsigned char *a;
  char zQuery[200];

  /* Avoid the pathological case */
  if( g.mxPage<1 ){
    printf("empty database\n");
    return;
  }

  /* Open the database file */
  db = openDatabase(zPrg, zDbName);

  /* Set up global variables zPageUse[] and g.mxPage to record page
  ** usages */
  zPageUse = sqlite3_malloc64( sizeof(zPageUse[0])*(g.mxPage+1) );
  if( zPageUse==0 ) out_of_memory();
  memset(zPageUse, 0, sizeof(zPageUse[0])*(g.mxPage+1));

  /* Discover the usage of each page */
  a = fileRead(0, 100);
  page_usage_freelist(decodeInt32(a+32));
  page_usage_ptrmap(a);
  sqlite3_free(a);
  page_usage_btree(1, 0, 0, "sqlite_schema");
  sqlite3_exec(db, "PRAGMA writable_schema=ON", 0, 0, 0);
  for(j=0; j<2; j++){
    sqlite3_snprintf(sizeof(zQuery), zQuery,
             "SELECT type, name, rootpage FROM SQLITE_MASTER WHERE rootpage"
             " ORDER BY rowid %s", j?"DESC":"");
    rc = sqlite3_prepare_v2(db, zQuery, -1, &pStmt, 0);
    if( rc==SQLITE_OK ){
      while( sqlite3_step(pStmt)==SQLITE_ROW ){
        u32 pgno = (u32)sqlite3_column_int64(pStmt, 2);
        page_usage_btree(pgno, 0, 0, (const char*)sqlite3_column_text(pStmt,1));
      }
    }else{
      printf("ERROR: cannot query database: %s\n", sqlite3_errmsg(db));
    }
    rc = sqlite3_finalize(pStmt);
    if( rc==SQLITE_OK ) break;
  }
  sqlite3_close(db);

  /* Print the report and free memory used */
  for(i=1; i<=g.mxPage; i++){
    if( zPageUse[i]==0 ) page_usage_btree(i, -1, 0, 0);
    printf("%5u: %s\n", i, zPageUse[i] ? zPageUse[i] : "???");
    sqlite3_free(zPageUse[i]);
  }
  sqlite3_free(zPageUse);
  zPageUse = 0;
}

/*
** Try to figure out how every page in the database file is being used.
*/
static void ptrmap_coverage_report(const char *zDbName){
  u64 pgno;
  unsigned char *aHdr;
  unsigned char *a;
  int usable;
  int perPage;
  int i;

  /* Avoid the pathological case */
  if( g.mxPage<1 ){
    printf("empty database\n");
    return;
  }

  /* Make sure PTRMAPs are used in this database */
  aHdr = fileRead(0, 100);
  if( aHdr[55]==0 ){
    printf("database does not use PTRMAP pages\n");
    return;
  }
  usable = g.pagesize - aHdr[20];
  perPage = usable/5;
  sqlite3_free(aHdr);
  printf("%5d: root of sqlite_schema\n", 1);
  for(pgno=2; pgno<=g.mxPage; pgno += perPage+1){
    printf("%5llu: PTRMAP page covering %llu..%llu\n", pgno,
           pgno+1, pgno+perPage);
    a = fileRead((pgno-1)*g.pagesize, usable);
    for(i=0; i+5<=usable && pgno+1+i/5<=g.mxPage; i+=5){
      const char *zType = "???";
      u32 iFrom = decodeInt32(&a[i+1]);
      switch( a[i] ){
        case 1:  zType = "b-tree root page";        break;
        case 2:  zType = "freelist page";           break;
        case 3:  zType = "first page of overflow";  break;
        case 4:  zType = "later page of overflow";  break;
        case 5:  zType = "b-tree non-root page";    break;
      }
      printf("%5llu: %s, parent=%u\n", pgno+1+i/5, zType, iFrom);
    }
    sqlite3_free(a);
  }
}

/*
** Print a usage comment
*/
static void usage(const char *argv0){
  fprintf(stderr, "Usage %s ?--uri? FILENAME ?args...?\n\n", argv0);
  fprintf(stderr,
    "switches:\n"
    "    --raw           Read db file directly, bypassing SQLite VFS\n"
    "args:\n"
    "    dbheader        Show database header\n"
    "    pgidx           Index of how each page is used\n"
    "    ptrmap          Show all PTRMAP page content\n"
    "    NNN..MMM        Show hex of pages NNN through MMM\n"
    "    NNN..end        Show hex of pages NNN through end of file\n"
    "    NNNb            Decode btree page NNN\n"
    "    NNNbc           Decode btree page NNN and show content\n"
    "    NNNbm           Decode btree page NNN and show a layout map\n"
    "    NNNbdCCC        Decode cell CCC on btree page NNN\n"
    "    NNNt            Decode freelist trunk page NNN\n"
    "    NNNtd           Show leaf freelist pages on the decode\n"
    "    NNNtr           Recursively decode freelist starting at NNN\n"
  );
}

int main(int argc, char **argv){
  sqlite3_int64 szFile;
  unsigned char *zPgSz;
  const char *zPrg = argv[0];     /* Name of this executable */
  char **azArg = argv;
  int nArg = argc;

  /* Check for the "--uri" or "-uri" switch. */
  if( nArg>1 ){
    if( sqlite3_stricmp("-raw", azArg[1])==0 
     || sqlite3_stricmp("--raw", azArg[1])==0
    ){
      g.bRaw = 1;
      azArg++;
      nArg--;
    }
  }

  if( nArg<2 ){
    usage(zPrg);
    exit(1);
  }

  fileOpen(zPrg, azArg[1]);
  szFile = fileGetsize();

  zPgSz = fileRead(16, 2);
  g.pagesize = zPgSz[0]*256 + zPgSz[1]*65536;
  if( g.pagesize==0 ) g.pagesize = 1024;
  sqlite3_free(zPgSz);

  printf("Pagesize: %d\n", g.pagesize);
  g.mxPage = (u32)((szFile+g.pagesize-1)/g.pagesize);

  printf("Available pages: 1..%u\n", g.mxPage);
  if( nArg==2 ){
    u32 i;
    for(i=1; i<=g.mxPage; i++) print_page(i);
  }else{
    int i;
    for(i=2; i<nArg; i++){
      u32 iStart, iEnd;
      char *zLeft;
      if( strcmp(azArg[i], "dbheader")==0 ){
        print_db_header();
        continue;
      }
      if( strcmp(azArg[i], "pgidx")==0 ){
        page_usage_report(zPrg, azArg[1]);
        continue;
      }
      if( strcmp(azArg[i], "ptrmap")==0 ){
        ptrmap_coverage_report(azArg[1]);
        continue;
      }
      if( strcmp(azArg[i], "help")==0 ){
        usage(zPrg);
        continue;
      }
      if( !ISDIGIT(azArg[i][0]) ){
        fprintf(stderr, "%s: unknown option: [%s]\n", zPrg, azArg[i]);
        continue;
      }
      iStart = strtoul(azArg[i], &zLeft, 0);
      if( zLeft && strcmp(zLeft,"..end")==0 ){
        iEnd = g.mxPage;
      }else if( zLeft && zLeft[0]=='.' && zLeft[1]=='.' ){
        iEnd = strtol(&zLeft[2], 0, 0);
      }else if( zLeft && zLeft[0]=='b' ){
        int ofst, nByte, hdrSize;
        unsigned char *a;
        if( iStart==1 ){
          ofst = hdrSize = 100;
          nByte = g.pagesize-100;
        }else{
          hdrSize = 0;
          ofst = (iStart-1)*g.pagesize;
          nByte = g.pagesize;
        }
        a = fileRead(ofst, nByte);
        decode_btree_page(a, iStart, hdrSize, &zLeft[1]);
        sqlite3_free(a);
        continue;
      }else if( zLeft && zLeft[0]=='t' ){
        int detail = 0;
        int recursive = 0;
        int j;
        for(j=1; zLeft[j]; j++){
          if( zLeft[j]=='r' ) recursive = 1;
          if( zLeft[j]=='d' ) detail = 1;
        }
        decode_trunk_page(iStart, detail, recursive);
        continue;
      }else{
        iEnd = iStart;
      }
      if( iStart<1 || iEnd<iStart || iEnd>g.mxPage ){
        fprintf(stderr,
          "Page argument should be LOWER?..UPPER?.  Range 1 to %d\n",
          g.mxPage);
        exit(1);
      }
      while( iStart<=iEnd ){
        print_page(iStart);
        iStart++;
      }
    }
  }
  fileClose();
  return 0;
}
