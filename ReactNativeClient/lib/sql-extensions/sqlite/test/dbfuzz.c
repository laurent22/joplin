/*
** 2016-12-17
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
** This program is designed for fuzz-testing SQLite database files.
**
** This program reads fuzzed database files from the disk files named
** on the command-line.  Each database is loaded into an in-memory
** filesystem so that the original database file is unmolested.
**
** The fuzzed database is then opened, and series of SQL statements
** are run against the database to ensure that SQLite can safely handle
** the fuzzed database.
*/
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <ctype.h>
#define ISSPACE(X) isspace((unsigned char)(X))
#define ISDIGIT(X) isdigit((unsigned char)(X))
#include "sqlite3.h"
#ifdef __unix__
# include <signal.h>
# include <unistd.h>
#endif

/*
** Print sketchy documentation for this utility program
*/
static void showHelp(const char *zArgv0){
  printf("Usage: %s [options] DATABASE ...\n", zArgv0);
  printf(
"Read databases into an in-memory filesystem.  Run test SQL as specified\n"
"by command-line arguments or from\n"
"\n"
"    SELECT group_concat(sql) FROM autoexec;\n"
"\n"
"Options:\n"
"  --help              Show this help text\n"
"  -q|--quiet          Reduced output\n"
"  --limit-mem N       Limit memory used by test SQLite instances to N bytes\n"
"  --limit-vdbe        Panic if any test runs for more than 100,000 cycles\n"
"  --no-lookaside      Disable the lookaside memory allocator\n"
"  --timeout N         Timeout after N seconds.\n"
"  --trace             Show the results of each SQL command\n"
"  -v|--verbose        Increased output.  Repeat for more output.\n"
  );
  exit(0);
}

/*
** Print an error message and quit.
*/
static void fatalError(const char *zFormat, ...){
  va_list ap;
  va_start(ap, zFormat);
  vfprintf(stderr, zFormat, ap);
  va_end(ap);
  fprintf(stderr, "\n");
  exit(1);
}

/*
** Files in the virtual file system.
*/
typedef struct VFile VFile;
typedef struct VHandle VHandle;
struct VFile {
  char *zFilename;      /* Filename. NULL for delete-on-close. From malloc() */
  int sz;               /* Size of the file in bytes */
  int nRef;             /* Number of references to this file */
  unsigned char *a;     /* Content of the file.  From malloc() */
};
struct VHandle {
  sqlite3_file base;    /* Base class.  Must be first */
  VFile *pVFile;        /* The underlying file */
};

/*
** Maximum number of files in the in-memory virtual filesystem.
*/
#define MX_FILE  10

/*
** Maximum allowed file size
*/
#define MX_FILE_SZ 1000000

/*
** All global variables are gathered into the "g" singleton.
*/
static struct GlobalVars {
  VFile aFile[MX_FILE];            /* The virtual filesystem */
} g;


/*
** Initialize the virtual file system.
*/
static void formatVfs(void){
  int i;
  for(i=0; i<MX_FILE; i++){
    g.aFile[i].sz = -1;
    g.aFile[i].zFilename = 0;
    g.aFile[i].a = 0;
    g.aFile[i].nRef = 0;
  }
}


/*
** Erase all information in the virtual file system.
*/
static void reformatVfs(void){
  int i;
  for(i=0; i<MX_FILE; i++){
    if( g.aFile[i].sz<0 ) continue;
    if( g.aFile[i].zFilename ){
      free(g.aFile[i].zFilename);
      g.aFile[i].zFilename = 0;
    }
    if( g.aFile[i].nRef>0 ){
      fatalError("file %d still open.  nRef=%d", i, g.aFile[i].nRef);
    }
    g.aFile[i].sz = -1;
    free(g.aFile[i].a);
    g.aFile[i].a = 0;
    g.aFile[i].nRef = 0;
  }
}

/*
** Find a VFile by name
*/
static VFile *findVFile(const char *zName){
  int i;
  if( zName==0 ) return 0;
  for(i=0; i<MX_FILE; i++){
    if( g.aFile[i].zFilename==0 ) continue;   
    if( strcmp(g.aFile[i].zFilename, zName)==0 ) return &g.aFile[i];
  }
  return 0;
}

/*
** Find a VFile called zName.  Initialize it to the content of
** disk file zDiskFile.
**
** Return NULL if the filesystem is full.
*/
static VFile *createVFile(const char *zName, const char *zDiskFile){
  VFile *pNew = findVFile(zName);
  int i;
  FILE *in = 0;
  long sz = 0;

  if( pNew ) return pNew;
  for(i=0; i<MX_FILE && g.aFile[i].sz>=0; i++){}
  if( i>=MX_FILE ) return 0;
  if( zDiskFile ){
    in = fopen(zDiskFile, "rb");
    if( in==0 ) fatalError("no such file: \"%s\"", zDiskFile);
    fseek(in, 0, SEEK_END);
    sz = ftell(in);
    rewind(in);
  }
  pNew = &g.aFile[i];
  if( zName ){
    int nName = (int)strlen(zName)+1;
    pNew->zFilename = malloc(nName);
    if( pNew->zFilename==0 ){
      if( in ) fclose(in);
      return 0;
    }
    memcpy(pNew->zFilename, zName, nName);
  }else{
    pNew->zFilename = 0;
  }
  pNew->nRef = 0;
  pNew->sz = sz;
  pNew->a = malloc(sz);
  if( sz>0 ){
    if( pNew->a==0 || fread(pNew->a, sz, 1, in)<1 ){
      free(pNew->zFilename);
      free(pNew->a);
      pNew->a = 0;
      pNew->zFilename = 0;
      pNew->sz = -1;
      pNew = 0;
    }
  }
  if( in ) fclose(in);
  return pNew;
}

/* Methods for the VHandle object
*/
static int inmemClose(sqlite3_file *pFile){
  VHandle *p = (VHandle*)pFile;
  VFile *pVFile = p->pVFile;
  pVFile->nRef--;
  if( pVFile->nRef==0 && pVFile->zFilename==0 ){
    pVFile->sz = -1;
    free(pVFile->a);
    pVFile->a = 0;
  }
  return SQLITE_OK;
}
static int inmemRead(
  sqlite3_file *pFile,   /* Read from this open file */
  void *pData,           /* Store content in this buffer */
  int iAmt,              /* Bytes of content */
  sqlite3_int64 iOfst    /* Start reading here */
){
  VHandle *pHandle = (VHandle*)pFile;
  VFile *pVFile = pHandle->pVFile;
  if( iOfst<0 || iOfst>=pVFile->sz ){
    memset(pData, 0, iAmt);
    return SQLITE_IOERR_SHORT_READ;
  }
  if( iOfst+iAmt>pVFile->sz ){
    memset(pData, 0, iAmt);
    iAmt = (int)(pVFile->sz - iOfst);
    memcpy(pData, pVFile->a, iAmt);
    return SQLITE_IOERR_SHORT_READ;
  }
  memcpy(pData, pVFile->a + iOfst, iAmt);
  return SQLITE_OK;
}
static int inmemWrite(
  sqlite3_file *pFile,   /* Write to this file */
  const void *pData,     /* Content to write */
  int iAmt,              /* bytes to write */
  sqlite3_int64 iOfst    /* Start writing here */
){
  VHandle *pHandle = (VHandle*)pFile;
  VFile *pVFile = pHandle->pVFile;
  if( iOfst+iAmt > pVFile->sz ){
    unsigned char *aNew;
    if( iOfst+iAmt >= MX_FILE_SZ ){
      return SQLITE_FULL;
    }
    aNew = realloc(pVFile->a, (int)(iOfst+iAmt));
    if( aNew==0 ){
      return SQLITE_FULL;
    }
    pVFile->a = aNew;
    if( iOfst > pVFile->sz ){
      memset(pVFile->a + pVFile->sz, 0, (int)(iOfst - pVFile->sz));
    }
    pVFile->sz = (int)(iOfst + iAmt);
  }
  memcpy(pVFile->a + iOfst, pData, iAmt);
  return SQLITE_OK;
}
static int inmemTruncate(sqlite3_file *pFile, sqlite3_int64 iSize){
  VHandle *pHandle = (VHandle*)pFile;
  VFile *pVFile = pHandle->pVFile;
  if( pVFile->sz>iSize && iSize>=0 ) pVFile->sz = (int)iSize;
  return SQLITE_OK;
}
static int inmemSync(sqlite3_file *pFile, int flags){
  return SQLITE_OK;
}
static int inmemFileSize(sqlite3_file *pFile, sqlite3_int64 *pSize){
  *pSize = ((VHandle*)pFile)->pVFile->sz;
  return SQLITE_OK;
}
static int inmemLock(sqlite3_file *pFile, int type){
  return SQLITE_OK;
}
static int inmemUnlock(sqlite3_file *pFile, int type){
  return SQLITE_OK;
}
static int inmemCheckReservedLock(sqlite3_file *pFile, int *pOut){
  *pOut = 0;
  return SQLITE_OK;
}
static int inmemFileControl(sqlite3_file *pFile, int op, void *pArg){
  return SQLITE_NOTFOUND;
}
static int inmemSectorSize(sqlite3_file *pFile){
  return 512;
}
static int inmemDeviceCharacteristics(sqlite3_file *pFile){
  return
      SQLITE_IOCAP_SAFE_APPEND |
      SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN |
      SQLITE_IOCAP_POWERSAFE_OVERWRITE;
}


/* Method table for VHandle
*/
static sqlite3_io_methods VHandleMethods = {
  /* iVersion    */  1,
  /* xClose      */  inmemClose,
  /* xRead       */  inmemRead,
  /* xWrite      */  inmemWrite,
  /* xTruncate   */  inmemTruncate,
  /* xSync       */  inmemSync,
  /* xFileSize   */  inmemFileSize,
  /* xLock       */  inmemLock,
  /* xUnlock     */  inmemUnlock,
  /* xCheck...   */  inmemCheckReservedLock,
  /* xFileCtrl   */  inmemFileControl,
  /* xSectorSz   */  inmemSectorSize,
  /* xDevchar    */  inmemDeviceCharacteristics,
  /* xShmMap     */  0,
  /* xShmLock    */  0,
  /* xShmBarrier */  0,
  /* xShmUnmap   */  0,
  /* xFetch      */  0,
  /* xUnfetch    */  0
};

/*
** Open a new file in the inmem VFS.  All files are anonymous and are
** delete-on-close.
*/
static int inmemOpen(
  sqlite3_vfs *pVfs,
  const char *zFilename,
  sqlite3_file *pFile,
  int openFlags,
  int *pOutFlags
){
  VFile *pVFile = createVFile(zFilename, 0);
  VHandle *pHandle = (VHandle*)pFile;
  if( pVFile==0 ){
    return SQLITE_FULL;
  }
  pHandle->pVFile = pVFile;
  pVFile->nRef++;
  pFile->pMethods = &VHandleMethods;
  if( pOutFlags ) *pOutFlags = openFlags;
  return SQLITE_OK;
}

/*
** Delete a file by name
*/
static int inmemDelete(
  sqlite3_vfs *pVfs,
  const char *zFilename,
  int syncdir
){
  VFile *pVFile = findVFile(zFilename);
  if( pVFile==0 ) return SQLITE_OK;
  if( pVFile->nRef==0 ){
    free(pVFile->zFilename);
    pVFile->zFilename = 0;
    pVFile->sz = -1;
    free(pVFile->a);
    pVFile->a = 0;
    return SQLITE_OK;
  }
  return SQLITE_IOERR_DELETE;
}

/* Check for the existance of a file
*/
static int inmemAccess(
  sqlite3_vfs *pVfs,
  const char *zFilename,
  int flags,
  int *pResOut
){
  VFile *pVFile = findVFile(zFilename);
  *pResOut =  pVFile!=0;
  return SQLITE_OK;
}

/* Get the canonical pathname for a file
*/
static int inmemFullPathname(
  sqlite3_vfs *pVfs,
  const char *zFilename,
  int nOut,
  char *zOut
){
  sqlite3_snprintf(nOut, zOut, "%s", zFilename);
  return SQLITE_OK;
}

/*
** Register the VFS that reads from the g.aFile[] set of files.
*/
static void inmemVfsRegister(void){
  static sqlite3_vfs inmemVfs;
  sqlite3_vfs *pDefault = sqlite3_vfs_find(0);
  inmemVfs.iVersion = 3;
  inmemVfs.szOsFile = sizeof(VHandle);
  inmemVfs.mxPathname = 200;
  inmemVfs.zName = "inmem";
  inmemVfs.xOpen = inmemOpen;
  inmemVfs.xDelete = inmemDelete;
  inmemVfs.xAccess = inmemAccess;
  inmemVfs.xFullPathname = inmemFullPathname;
  inmemVfs.xRandomness = pDefault->xRandomness;
  inmemVfs.xSleep = pDefault->xSleep;
  inmemVfs.xCurrentTimeInt64 = pDefault->xCurrentTimeInt64;
  sqlite3_vfs_register(&inmemVfs, 0);
};

/*
** Timeout handler
*/
#ifdef __unix__
static void timeoutHandler(int NotUsed){
  (void)NotUsed;
  fatalError("timeout\n");
}
#endif

/*
** Set the an alarm to go off after N seconds.  Disable the alarm
** if N==0
*/
static void setAlarm(int N){
#ifdef __unix__
  alarm(N);
#else
  (void)N;
#endif
}
/***************************************************************************
** String accumulator object
*/
typedef struct Str Str;
struct Str {
  char *z;                /* The string.  Memory from malloc() */
  sqlite3_uint64 n;       /* Bytes of input used */
  sqlite3_uint64 nAlloc;  /* Bytes allocated to z[] */
  int oomErr;             /* OOM error has been seen */
};

/* Initialize a Str object */
static void StrInit(Str *p){
  memset(p, 0, sizeof(*p));
}

/* Append text to the end of a Str object */
static void StrAppend(Str *p, const char *z){
  sqlite3_uint64 n = strlen(z);
  if( p->n + n >= p->nAlloc ){
    char *zNew;
    sqlite3_uint64 nNew;
    if( p->oomErr ) return;
    nNew = p->nAlloc*2 + 100 + n;
    zNew = sqlite3_realloc64(p->z, nNew);
    if( zNew==0 ){
      sqlite3_free(p->z);
      memset(p, 0, sizeof(*p));
      p->oomErr = 1;
      return;
    }
    p->z = zNew;
    p->nAlloc = nNew;
  }
  memcpy(p->z + p->n, z, (int)n);
  p->n += n;
  p->z[p->n] = 0;
}

/* Return the current string content */
static char *StrStr(Str *p){
 return p->z;
}

/* Free the string */
static void StrFree(Str *p){
  sqlite3_free(p->z);
  StrInit(p);
}

/*
** Return the value of a hexadecimal digit.  Return -1 if the input
** is not a hex digit.
*/
static int hexDigitValue(char c){
  if( c>='0' && c<='9' ) return c - '0';
  if( c>='a' && c<='f' ) return c - 'a' + 10;
  if( c>='A' && c<='F' ) return c - 'A' + 10;
  return -1;
}

/*
** Interpret zArg as an integer value, possibly with suffixes.
*/
static int integerValue(const char *zArg){
  sqlite3_int64 v = 0;
  static const struct { char *zSuffix; int iMult; } aMult[] = {
    { "KiB", 1024 },
    { "MiB", 1024*1024 },
    { "GiB", 1024*1024*1024 },
    { "KB",  1000 },
    { "MB",  1000000 },
    { "GB",  1000000000 },
    { "K",   1000 },
    { "M",   1000000 },
    { "G",   1000000000 },
  };
  int i;
  int isNeg = 0;
  if( zArg[0]=='-' ){
    isNeg = 1;
    zArg++;
  }else if( zArg[0]=='+' ){
    zArg++;
  }
  if( zArg[0]=='0' && zArg[1]=='x' ){
    int x;
    zArg += 2;
    while( (x = hexDigitValue(zArg[0]))>=0 ){
      v = (v<<4) + x;
      zArg++;
    }
  }else{
    while( ISDIGIT(zArg[0]) ){
      v = v*10 + zArg[0] - '0';
      zArg++;
    }
  }
  for(i=0; i<sizeof(aMult)/sizeof(aMult[0]); i++){
    if( sqlite3_stricmp(aMult[i].zSuffix, zArg)==0 ){
      v *= aMult[i].iMult;
      break;
    }
  }
  if( v>0x7fffffff ) fatalError("parameter too large - max 2147483648");
  return (int)(isNeg? -v : v);
}

/*
** This callback is invoked by sqlite3_log().
*/
static void sqlLog(void *pNotUsed, int iErrCode, const char *zMsg){
  printf("LOG: (%d) %s\n", iErrCode, zMsg);
  fflush(stdout);
}

#ifndef SQLITE_OMIT_PROGRESS_CALLBACK
/*
** This an SQL progress handler.  After an SQL statement has run for
** many steps, we want to interrupt it.  This guards against infinite
** loops from recursive common table expressions.
**
** *pVdbeLimitFlag is true if the --limit-vdbe command-line option is used.
** In that case, hitting the progress handler is a fatal error.
*/
static int progressHandler(void *pVdbeLimitFlag){
  if( *(int*)pVdbeLimitFlag ) fatalError("too many VDBE cycles");
  return 1;
}
#endif

/*
** Allowed values for the runFlags parameter to runSql()
*/
#define SQL_TRACE  0x0001     /* Print each SQL statement as it is prepared */
#define SQL_OUTPUT 0x0002     /* Show the SQL output */

/*
** Run multiple commands of SQL.  Similar to sqlite3_exec(), but does not
** stop if an error is encountered.
*/
static void runSql(sqlite3 *db, const char *zSql, unsigned  runFlags){
  const char *zMore;
  const char *zEnd = &zSql[strlen(zSql)];
  sqlite3_stmt *pStmt;

  while( zSql && zSql[0] ){
    zMore = 0;
    pStmt = 0;
    sqlite3_prepare_v2(db, zSql, -1, &pStmt, &zMore);
    assert( zMore<=zEnd );
    if( zMore==zSql ) break;
    if( runFlags & SQL_TRACE ){
      const char *z = zSql;
      int n;
      while( z<zMore && ISSPACE(z[0]) ) z++;
      n = (int)(zMore - z);
      while( n>0 && ISSPACE(z[n-1]) ) n--;
      if( n==0 ) break;
      if( pStmt==0 ){
        printf("TRACE: %.*s (error: %s)\n", n, z, sqlite3_errmsg(db));
      }else{
        printf("TRACE: %.*s\n", n, z);
      }
    }
    zSql = zMore;
    if( pStmt ){
      if( (runFlags & SQL_OUTPUT)==0 ){
        while( SQLITE_ROW==sqlite3_step(pStmt) ){}
      }else{
        int nCol = -1;
        int nRow;
        for(nRow=0; SQLITE_ROW==sqlite3_step(pStmt); nRow++){
          int i;
          if( nCol<0 ){
            nCol = sqlite3_column_count(pStmt);
          }
          for(i=0; i<nCol; i++){
            int eType = sqlite3_column_type(pStmt,i);
            printf("ROW[%d].%s = ", nRow, sqlite3_column_name(pStmt,i));
            switch( eType ){
              case SQLITE_NULL: {
                printf("NULL\n");
                break;
              }
              case SQLITE_INTEGER: {
                printf("INT %s\n", sqlite3_column_text(pStmt,i));
                break;
              }
              case SQLITE_FLOAT: {
                printf("FLOAT %s\n", sqlite3_column_text(pStmt,i));
                break;
              }
              case SQLITE_TEXT: {
                printf("TEXT [%s]\n", sqlite3_column_text(pStmt,i));
                break;
              }
              case SQLITE_BLOB: {
                printf("BLOB (%d bytes)\n", sqlite3_column_bytes(pStmt,i));
                break;
              }
            }
          }
        }
      }         
      sqlite3_finalize(pStmt);
    }
  }
}

int main(int argc, char **argv){
  int i;                 /* Loop counter */
  int nDb = 0;           /* Number of databases to fuzz */
  char **azDb = 0;       /* Names of the databases (limit: 20) */
  int verboseFlag = 0;   /* True for extra output */
  int noLookaside = 0;   /* Disable lookaside if true */
  int vdbeLimitFlag = 0; /* Stop after 100,000 VDBE ops */
  int nHeap = 0;         /* True for fixed heap size */
  int iTimeout = 0;      /* Timeout delay in seconds */
  int rc;                /* Result code from SQLite3 API calls */
  sqlite3 *db;           /* The database connection */
  sqlite3_stmt *pStmt;   /* A single SQL statement */
  Str sql;               /* SQL to run */
  unsigned runFlags = 0; /* Flags passed to runSql */

  for(i=1; i<argc; i++){
    char *z = argv[i];
    if( z[0]!='-' ){
      azDb = realloc(azDb, sizeof(azDb[0])*(nDb+1));
      if( azDb==0 ) fatalError("out of memory");
      azDb[nDb++] = z;
      continue;
    }
    z++;
    if( z[0]=='-' ) z++;
    if( strcmp(z, "help")==0 ){
      showHelp(argv[0]);
    }else if( strcmp(z, "limit-mem")==0 ){
      if( i==argc-1 ) fatalError("missing argument to %s", argv[i]);
      nHeap = integerValue(argv[++i]);
    }else if( strcmp(z, "no-lookaside")==0 ){
      noLookaside = 1;
    }else if( strcmp(z, "timeout")==0 ){
      if( i==argc-1 ) fatalError("missing argument to %s", argv[i]);
      iTimeout = integerValue(argv[++i]);
    }else if( strcmp(z, "trace")==0 ){
      runFlags |= SQL_OUTPUT|SQL_TRACE;
    }else if( strcmp(z, "limit-vdbe")==0 ){
      vdbeLimitFlag = 1;
    }else if( strcmp(z, "v")==0 || strcmp(z, "verbose")==0 ){
      verboseFlag = 1;
      runFlags |= SQL_TRACE;
    }else{
      fatalError("unknown command-line option: \"%s\"\n", argv[i]);
    }
  }
  if( nDb==0 ){
    showHelp(argv[0]);
  }
  if( verboseFlag ){
    sqlite3_config(SQLITE_CONFIG_LOG, sqlLog);
  }
  if( nHeap>0 ){
    void *pHeap = malloc( nHeap );
    if( pHeap==0 ) fatalError("cannot allocate %d-byte heap\n", nHeap);
    rc = sqlite3_config(SQLITE_CONFIG_HEAP, pHeap, nHeap, 32);
    if( rc ) fatalError("heap configuration failed: %d\n", rc);
  }
  if( noLookaside ){
    sqlite3_config(SQLITE_CONFIG_LOOKASIDE, 0, 0);
  }
  inmemVfsRegister();
  formatVfs();
  StrInit(&sql);
#ifdef __unix__
  signal(SIGALRM, timeoutHandler);
#endif
  for(i=0; i<nDb; i++){
    if( verboseFlag && nDb>1 ){
      printf("DATABASE-FILE: %s\n", azDb[i]);
      fflush(stdout);
    }
    if( iTimeout ) setAlarm(iTimeout);
    createVFile("test.db", azDb[i]);
    rc = sqlite3_open_v2("test.db", &db, SQLITE_OPEN_READWRITE, "inmem");
    if( rc ){
      printf("cannot open test.db for \"%s\"\n", azDb[i]);
      reformatVfs();
      continue;
    }
#ifndef SQLITE_OMIT_PROGRESS_CALLBACK
    if( vdbeLimitFlag ){
      sqlite3_progress_handler(db, 100000, progressHandler, &vdbeLimitFlag);
    }
#endif
    rc = sqlite3_prepare_v2(db, "SELECT sql FROM autoexec", -1, &pStmt, 0);
    if( rc==SQLITE_OK ){
      while( SQLITE_ROW==sqlite3_step(pStmt) ){
        StrAppend(&sql, (const char*)sqlite3_column_text(pStmt, 0));
        StrAppend(&sql, "\n");
      }
    }
    sqlite3_finalize(pStmt);
    StrAppend(&sql, "PRAGMA integrity_check;\n");
    runSql(db, StrStr(&sql), runFlags);
    sqlite3_close(db);
    reformatVfs();
    StrFree(&sql);
    if( sqlite3_memory_used()>0 ){
      free(azDb);
      reformatVfs();
      fatalError("memory leak of %lld bytes", sqlite3_memory_used());
    }
  }
  StrFree(&sql);
  reformatVfs();
  return 0;
}
