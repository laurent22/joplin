/*
** A program for performance testing.
**
** The available command-line options are described below:
*/
static const char zHelp[] =
  "Usage: %s [--options] DATABASE\n"
  "Options:\n"
  "  --autovacuum        Enable AUTOVACUUM mode\n"
  "  --cachesize N       Set the cache size to N\n"
  "  --checkpoint        Run PRAGMA wal_checkpoint after each test case\n"
  "  --exclusive         Enable locking_mode=EXCLUSIVE\n"
  "  --explain           Like --sqlonly but with added EXPLAIN keywords\n"
  "  --heap SZ MIN       Memory allocator uses SZ bytes & min allocation MIN\n"
  "  --incrvacuum        Enable incremenatal vacuum mode\n"
  "  --journal M         Set the journal_mode to M\n"
  "  --key KEY           Set the encryption key to KEY\n"
  "  --lookaside N SZ    Configure lookaside for N slots of SZ bytes each\n"
  "  --memdb             Use an in-memory database\n"
  "  --mmap SZ           MMAP the first SZ bytes of the database file\n"
  "  --multithread       Set multithreaded mode\n"
  "  --nomemstat         Disable memory statistics\n"
  "  --nosync            Set PRAGMA synchronous=OFF\n"
  "  --notnull           Add NOT NULL constraints to table columns\n"
  "  --output FILE       Store SQL output in FILE\n"
  "  --pagesize N        Set the page size to N\n"
  "  --pcache N SZ       Configure N pages of pagecache each of size SZ bytes\n"
  "  --primarykey        Use PRIMARY KEY instead of UNIQUE where appropriate\n"
  "  --repeat N          Repeat each SELECT N times (default: 1)\n"
  "  --reprepare         Reprepare each statement upon every invocation\n"
  "  --serialized        Set serialized threading mode\n"
  "  --singlethread      Set single-threaded mode - disables all mutexing\n"
  "  --sqlonly           No-op.  Only show the SQL that would have been run.\n"
  "  --shrink-memory     Invoke sqlite3_db_release_memory() frequently.\n"
  "  --size N            Relative test size.  Default=100\n"
  "  --stats             Show statistics at the end\n"
  "  --temp N            N from 0 to 9.  0: no temp table. 9: all temp tables\n"
  "  --testset T         Run test-set T (main, cte, rtree, orm, fp, debug)\n"
  "  --trace             Turn on SQL tracing\n"
  "  --threads N         Use up to N threads for sorting\n"
  "  --utf16be           Set text encoding to UTF-16BE\n"
  "  --utf16le           Set text encoding to UTF-16LE\n"
  "  --verify            Run additional verification steps.\n"
  "  --without-rowid     Use WITHOUT ROWID where appropriate\n"
;

#include "sqlite3.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <ctype.h>
#ifndef _WIN32
# include <unistd.h>
#else
# include <io.h>
#endif
#define ISSPACE(X) isspace((unsigned char)(X))
#define ISDIGIT(X) isdigit((unsigned char)(X))

#if SQLITE_VERSION_NUMBER<3005000
# define sqlite3_int64 sqlite_int64
#endif

typedef sqlite3_uint64 u64;

/*
** State structure for a Hash hash in progress
*/
typedef struct HashContext HashContext;
struct HashContext {
  unsigned char isInit;          /* True if initialized */
  unsigned char i, j;            /* State variables */
  unsigned char s[256];          /* State variables */
  unsigned char r[32];           /* Result */
};


/* All global state is held in this structure */
static struct Global {
  sqlite3 *db;               /* The open database connection */
  sqlite3_stmt *pStmt;       /* Current SQL statement */
  sqlite3_int64 iStart;      /* Start-time for the current test */
  sqlite3_int64 iTotal;      /* Total time */
  int bWithoutRowid;         /* True for --without-rowid */
  int bReprepare;            /* True to reprepare the SQL on each rerun */
  int bSqlOnly;              /* True to print the SQL once only */
  int bExplain;              /* Print SQL with EXPLAIN prefix */
  int bVerify;               /* Try to verify that results are correct */
  int bMemShrink;            /* Call sqlite3_db_release_memory() often */
  int eTemp;                 /* 0: no TEMP.  9: always TEMP. */
  int szTest;                /* Scale factor for test iterations */
  int nRepeat;               /* Repeat selects this many times */
  int doCheckpoint;          /* Run PRAGMA wal_checkpoint after each trans */
  const char *zWR;           /* Might be WITHOUT ROWID */
  const char *zNN;           /* Might be NOT NULL */
  const char *zPK;           /* Might be UNIQUE or PRIMARY KEY */
  unsigned int x, y;         /* Pseudo-random number generator state */
  u64 nResByte;              /* Total number of result bytes */
  int nResult;               /* Size of the current result */
  char zResult[3000];        /* Text of the current result */
#ifndef SPEEDTEST_OMIT_HASH
  FILE *hashFile;            /* Store all hash results in this file */
  HashContext hash;          /* Hash of all output */
#endif
} g;

/* Return " TEMP" or "", as appropriate for creating a table.
*/
static const char *isTemp(int N){
  return g.eTemp>=N ? " TEMP" : "";
}

/* Print an error message and exit */
static void fatal_error(const char *zMsg, ...){
  va_list ap;
  va_start(ap, zMsg);
  vfprintf(stderr, zMsg, ap);
  va_end(ap);
  exit(1);
}

#ifndef SPEEDTEST_OMIT_HASH
/****************************************************************************
** Hash algorithm used to verify that compilation is not miscompiled
** in such a was as to generate an incorrect result.
*/

/*
** Initialize a new hash.  iSize determines the size of the hash
** in bits and should be one of 224, 256, 384, or 512.  Or iSize
** can be zero to use the default hash size of 256 bits.
*/
static void HashInit(void){
  unsigned int k;
  g.hash.i = 0;
  g.hash.j = 0;
  for(k=0; k<256; k++) g.hash.s[k] = k;
}

/*
** Make consecutive calls to the HashUpdate function to add new content
** to the hash
*/
static void HashUpdate(
  const unsigned char *aData,
  unsigned int nData
){
  unsigned char t;
  unsigned char i = g.hash.i;
  unsigned char j = g.hash.j;
  unsigned int k;
  if( g.hashFile ) fwrite(aData, 1, nData, g.hashFile);
  for(k=0; k<nData; k++){
    j += g.hash.s[i] + aData[k];
    t = g.hash.s[j];
    g.hash.s[j] = g.hash.s[i];
    g.hash.s[i] = t;
    i++;
  }
  g.hash.i = i;
  g.hash.j = j;
}

/*
** After all content has been added, invoke HashFinal() to compute
** the final hash.  The hash result is stored in g.hash.r[].
*/
static void HashFinal(void){
  unsigned int k;
  unsigned char t, i, j;
  i = g.hash.i;
  j = g.hash.j;
  for(k=0; k<32; k++){
    i++;
    t = g.hash.s[i];
    j += t;
    g.hash.s[i] = g.hash.s[j];
    g.hash.s[j] = t;
    t += g.hash.s[i];
    g.hash.r[k] = g.hash.s[t];
  }
}

/* End of the Hash hashing logic
*****************************************************************************/
#endif /* SPEEDTEST_OMIT_HASH */

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

/* Provide an alternative to sqlite3_stricmp() in older versions of
** SQLite */
#if SQLITE_VERSION_NUMBER<3007011
# define sqlite3_stricmp strcmp
#endif

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
    while( isdigit(zArg[0]) ){
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
  if( v>0x7fffffff ) fatal_error("parameter too large - max 2147483648");
  return (int)(isNeg? -v : v);
}

/* Return the current wall-clock time, in milliseconds */
sqlite3_int64 speedtest1_timestamp(void){
#if SQLITE_VERSION_NUMBER<3005000
  return 0;
#else
  static sqlite3_vfs *clockVfs = 0;
  sqlite3_int64 t;
  if( clockVfs==0 ) clockVfs = sqlite3_vfs_find(0);
#if SQLITE_VERSION_NUMBER>=3007000
  if( clockVfs->iVersion>=2 && clockVfs->xCurrentTimeInt64!=0 ){
    clockVfs->xCurrentTimeInt64(clockVfs, &t);
  }else
#endif
  {
    double r;
    clockVfs->xCurrentTime(clockVfs, &r);
    t = (sqlite3_int64)(r*86400000.0);
  }
  return t;
#endif
}

/* Return a pseudo-random unsigned integer */
unsigned int speedtest1_random(void){
  g.x = (g.x>>1) ^ ((1+~(g.x&1)) & 0xd0000001);
  g.y = g.y*1103515245 + 12345;
  return g.x ^ g.y;
}

/* Map the value in within the range of 1...limit into another
** number in a way that is chatic and invertable.
*/
unsigned swizzle(unsigned in, unsigned limit){
  unsigned out = 0;
  while( limit ){
    out = (out<<1) | (in&1);
    in >>= 1;
    limit >>= 1;
  }
  return out;
}

/* Round up a number so that it is a power of two minus one
*/
unsigned roundup_allones(unsigned limit){
  unsigned m = 1;
  while( m<limit ) m = (m<<1)+1;
  return m;
}

/* The speedtest1_numbername procedure below converts its argment (an integer)
** into a string which is the English-language name for that number.
** The returned string should be freed with sqlite3_free().
**
** Example:
**
**     speedtest1_numbername(123)   ->  "one hundred twenty three"
*/
int speedtest1_numbername(unsigned int n, char *zOut, int nOut){
  static const char *ones[] = {  "zero", "one", "two", "three", "four", "five", 
                  "six", "seven", "eight", "nine", "ten", "eleven", "twelve", 
                  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
                  "eighteen", "nineteen" };
  static const char *tens[] = { "", "ten", "twenty", "thirty", "forty",
                 "fifty", "sixty", "seventy", "eighty", "ninety" };
  int i = 0;

  if( n>=1000000000 ){
    i += speedtest1_numbername(n/1000000000, zOut+i, nOut-i);
    sqlite3_snprintf(nOut-i, zOut+i, " billion");
    i += (int)strlen(zOut+i);
    n = n % 1000000000;
  }
  if( n>=1000000 ){
    if( i && i<nOut-1 ) zOut[i++] = ' ';
    i += speedtest1_numbername(n/1000000, zOut+i, nOut-i);
    sqlite3_snprintf(nOut-i, zOut+i, " million");
    i += (int)strlen(zOut+i);
    n = n % 1000000;
  }
  if( n>=1000 ){
    if( i && i<nOut-1 ) zOut[i++] = ' ';
    i += speedtest1_numbername(n/1000, zOut+i, nOut-i);
    sqlite3_snprintf(nOut-i, zOut+i, " thousand");
    i += (int)strlen(zOut+i);
    n = n % 1000;
  }
  if( n>=100 ){
    if( i && i<nOut-1 ) zOut[i++] = ' ';
    sqlite3_snprintf(nOut-i, zOut+i, "%s hundred", ones[n/100]);
    i += (int)strlen(zOut+i);
    n = n % 100;
  }
  if( n>=20 ){
    if( i && i<nOut-1 ) zOut[i++] = ' ';
    sqlite3_snprintf(nOut-i, zOut+i, "%s", tens[n/10]);
    i += (int)strlen(zOut+i);
    n = n % 10;
  }
  if( n>0 ){
    if( i && i<nOut-1 ) zOut[i++] = ' ';
    sqlite3_snprintf(nOut-i, zOut+i, "%s", ones[n]);
    i += (int)strlen(zOut+i);
  }
  if( i==0 ){
    sqlite3_snprintf(nOut-i, zOut+i, "zero");
    i += (int)strlen(zOut+i);
  }
  return i;
}


/* Start a new test case */
#define NAMEWIDTH 60
static const char zDots[] =
  ".......................................................................";
void speedtest1_begin_test(int iTestNum, const char *zTestName, ...){
  int n = (int)strlen(zTestName);
  char *zName;
  va_list ap;
  va_start(ap, zTestName);
  zName = sqlite3_vmprintf(zTestName, ap);
  va_end(ap);
  n = (int)strlen(zName);
  if( n>NAMEWIDTH ){
    zName[NAMEWIDTH] = 0;
    n = NAMEWIDTH;
  }
  if( g.bSqlOnly ){
    printf("/* %4d - %s%.*s */\n", iTestNum, zName, NAMEWIDTH-n, zDots);
  }else{
    printf("%4d - %s%.*s ", iTestNum, zName, NAMEWIDTH-n, zDots);
    fflush(stdout);
  }
  sqlite3_free(zName);
  g.nResult = 0;
  g.iStart = speedtest1_timestamp();
  g.x = 0xad131d0b;
  g.y = 0x44f9eac8;
}

/* Forward reference */
void speedtest1_exec(const char*,...);

/* Complete a test case */
void speedtest1_end_test(void){
  sqlite3_int64 iElapseTime = speedtest1_timestamp() - g.iStart;
  if( g.doCheckpoint ) speedtest1_exec("PRAGMA wal_checkpoint;");
  if( !g.bSqlOnly ){
    g.iTotal += iElapseTime;
    printf("%4d.%03ds\n", (int)(iElapseTime/1000), (int)(iElapseTime%1000));
  }
  if( g.pStmt ){
    sqlite3_finalize(g.pStmt);
    g.pStmt = 0;
  }
}

/* Report end of testing */
void speedtest1_final(void){
  if( !g.bSqlOnly ){
    printf("       TOTAL%.*s %4d.%03ds\n", NAMEWIDTH-5, zDots,
           (int)(g.iTotal/1000), (int)(g.iTotal%1000));
  }
  if( g.bVerify ){
#ifndef SPEEDTEST_OMIT_HASH
    int i;
#endif
    printf("Verification Hash: %llu ", g.nResByte);
#ifndef SPEEDTEST_OMIT_HASH
    HashUpdate((const unsigned char*)"\n", 1);
    HashFinal();
    for(i=0; i<24; i++){
      printf("%02x", g.hash.r[i]);
    }
    if( g.hashFile && g.hashFile!=stdout ) fclose(g.hashFile);
#endif
    printf("\n");
  }
}

/* Print an SQL statement to standard output */
static void printSql(const char *zSql){
  int n = (int)strlen(zSql);
  while( n>0 && (zSql[n-1]==';' || ISSPACE(zSql[n-1])) ){ n--; }
  if( g.bExplain ) printf("EXPLAIN ");
  printf("%.*s;\n", n, zSql);
  if( g.bExplain
#if SQLITE_VERSION_NUMBER>=3007017 
   && ( sqlite3_strglob("CREATE *", zSql)==0
     || sqlite3_strglob("DROP *", zSql)==0
     || sqlite3_strglob("ALTER *", zSql)==0
      )
#endif
  ){
    printf("%.*s;\n", n, zSql);
  }
}

/* Shrink memory used, if appropriate and if the SQLite version is capable
** of doing so.
*/
void speedtest1_shrink_memory(void){
#if SQLITE_VERSION_NUMBER>=3007010
  if( g.bMemShrink ) sqlite3_db_release_memory(g.db);
#endif
}

/* Run SQL */
void speedtest1_exec(const char *zFormat, ...){
  va_list ap;
  char *zSql;
  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( g.bSqlOnly ){
    printSql(zSql);
  }else{
    char *zErrMsg = 0;
    int rc = sqlite3_exec(g.db, zSql, 0, 0, &zErrMsg);
    if( zErrMsg ) fatal_error("SQL error: %s\n%s\n", zErrMsg, zSql);
    if( rc!=SQLITE_OK ) fatal_error("exec error: %s\n", sqlite3_errmsg(g.db));
  }
  sqlite3_free(zSql);
  speedtest1_shrink_memory();
}

/* Run SQL and return the first column of the first row as a string.  The
** returned string is obtained from sqlite_malloc() and must be freed by
** the caller.
*/
char *speedtest1_once(const char *zFormat, ...){
  va_list ap;
  char *zSql;
  sqlite3_stmt *pStmt;
  char *zResult = 0;
  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( g.bSqlOnly ){
    printSql(zSql);
  }else{
    int rc = sqlite3_prepare_v2(g.db, zSql, -1, &pStmt, 0);
    if( rc ){
      fatal_error("SQL error: %s\n", sqlite3_errmsg(g.db));
    }
    if( sqlite3_step(pStmt)==SQLITE_ROW ){
      const char *z = (const char*)sqlite3_column_text(pStmt, 0);
      if( z ) zResult = sqlite3_mprintf("%s", z);
    }
    sqlite3_finalize(pStmt);
  }
  sqlite3_free(zSql);
  speedtest1_shrink_memory();
  return zResult;
}

/* Prepare an SQL statement */
void speedtest1_prepare(const char *zFormat, ...){
  va_list ap;
  char *zSql;
  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( g.bSqlOnly ){
    printSql(zSql);
  }else{
    int rc;
    if( g.pStmt ) sqlite3_finalize(g.pStmt);
    rc = sqlite3_prepare_v2(g.db, zSql, -1, &g.pStmt, 0);
    if( rc ){
      fatal_error("SQL error: %s\n", sqlite3_errmsg(g.db));
    }
  }
  sqlite3_free(zSql);
}

/* Run an SQL statement previously prepared */
void speedtest1_run(void){
  int i, n, len;
  if( g.bSqlOnly ) return;
  assert( g.pStmt );
  g.nResult = 0;
  while( sqlite3_step(g.pStmt)==SQLITE_ROW ){
    n = sqlite3_column_count(g.pStmt);
    for(i=0; i<n; i++){
      const char *z = (const char*)sqlite3_column_text(g.pStmt, i);
      if( z==0 ) z = "nil";
      len = (int)strlen(z);
#ifndef SPEEDTEST_OMIT_HASH
      if( g.bVerify ){
        int eType = sqlite3_column_type(g.pStmt, i);
        unsigned char zPrefix[2];
        zPrefix[0] = '\n';
        zPrefix[1] = "-IFTBN"[eType];
        if( g.nResByte ){
          HashUpdate(zPrefix, 2);
        }else{
          HashUpdate(zPrefix+1, 1);
        }
        if( eType==SQLITE_FLOAT ){
          /* Omit the value of floating-point results from the verification
          ** hash.  The only thing we record is the fact that the result was
          ** a floating-point value. */
          g.nResByte += 2;
        }else if( eType==SQLITE_BLOB ){
          int nBlob = sqlite3_column_bytes(g.pStmt, i);
          int iBlob;
          unsigned char zChar[2];
          const unsigned char *aBlob = sqlite3_column_blob(g.pStmt, i);
          for(iBlob=0; iBlob<nBlob; iBlob++){
            zChar[0] = "0123456789abcdef"[aBlob[iBlob]>>4];
            zChar[1] = "0123456789abcdef"[aBlob[iBlob]&15];
            HashUpdate(zChar,2);
          }
          g.nResByte += nBlob*2 + 2;
        }else{
          HashUpdate((unsigned char*)z, len);
          g.nResByte += len + 2;
        }
      }
#endif
      if( g.nResult+len<sizeof(g.zResult)-2 ){
        if( g.nResult>0 ) g.zResult[g.nResult++] = ' ';
        memcpy(g.zResult + g.nResult, z, len+1);
        g.nResult += len;
      }
    }
  }
#if SQLITE_VERSION_NUMBER>=3006001
  if( g.bReprepare ){
    sqlite3_stmt *pNew;
    sqlite3_prepare_v2(g.db, sqlite3_sql(g.pStmt), -1, &pNew, 0);
    sqlite3_finalize(g.pStmt);
    g.pStmt = pNew;
  }else
#endif
  {
    sqlite3_reset(g.pStmt);
  }
  speedtest1_shrink_memory();
}

#ifndef SQLITE_OMIT_DEPRECATED
/* The sqlite3_trace() callback function */
static void traceCallback(void *NotUsed, const char *zSql){
  int n = (int)strlen(zSql);
  while( n>0 && (zSql[n-1]==';' || ISSPACE(zSql[n-1])) ) n--;
  fprintf(stderr,"%.*s;\n", n, zSql);
}
#endif /* SQLITE_OMIT_DEPRECATED */

/* Substitute random() function that gives the same random
** sequence on each run, for repeatability. */
static void randomFunc(
  sqlite3_context *context,
  int NotUsed,
  sqlite3_value **NotUsed2
){
  sqlite3_result_int64(context, (sqlite3_int64)speedtest1_random());
}

/* Estimate the square root of an integer */
static int est_square_root(int x){
  int y0 = x/2;
  int y1;
  int n;
  for(n=0; y0>0 && n<10; n++){
    y1 = (y0 + x/y0)/2;
    if( y1==y0 ) break;
    y0 = y1;
  }
  return y0;
}


#if SQLITE_VERSION_NUMBER<3005004
/*
** An implementation of group_concat().  Used only when testing older
** versions of SQLite that lack the built-in group_concat().
*/
struct groupConcat {
  char *z;
  int nAlloc;
  int nUsed;
};
static void groupAppend(struct groupConcat *p, const char *z, int n){
  if( p->nUsed+n >= p->nAlloc ){
    int n2 = (p->nAlloc+n+1)*2;
    char *z2 = sqlite3_realloc(p->z, n2);
    if( z2==0 ) return;
    p->z = z2;
    p->nAlloc = n2;
  }
  memcpy(p->z+p->nUsed, z, n);
  p->nUsed += n;
}
static void groupStep(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zVal;
  struct groupConcat *p;
  const char *zSep;
  int nVal, nSep;
  assert( argc==1 || argc==2 );
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  p= (struct groupConcat*)sqlite3_aggregate_context(context, sizeof(*p));

  if( p ){
    int firstTerm = p->nUsed==0;
    if( !firstTerm ){
      if( argc==2 ){
        zSep = (char*)sqlite3_value_text(argv[1]);
        nSep = sqlite3_value_bytes(argv[1]);
      }else{
        zSep = ",";
        nSep = 1;
      }
      if( nSep ) groupAppend(p, zSep, nSep);
    }
    zVal = (char*)sqlite3_value_text(argv[0]);
    nVal = sqlite3_value_bytes(argv[0]);
    if( zVal ) groupAppend(p, zVal, nVal);
  }
}
static void groupFinal(sqlite3_context *context){
  struct groupConcat *p;
  p = sqlite3_aggregate_context(context, 0);
  if( p && p->z ){
    p->z[p->nUsed] = 0;
    sqlite3_result_text(context, p->z, p->nUsed, sqlite3_free);
  }
}
#endif

/*
** The main and default testset
*/
void testset_main(void){
  int i;                        /* Loop counter */
  int n;                        /* iteration count */
  int sz;                       /* Size of the tables */
  int maxb;                     /* Maximum swizzled value */
  unsigned x1 = 0, x2 = 0;      /* Parameters */
  int len = 0;                  /* Length of the zNum[] string */
  char zNum[2000];              /* A number name */

  sz = n = g.szTest*500;
  zNum[0] = 0;
  maxb = roundup_allones(sz);
  speedtest1_begin_test(100, "%d INSERTs into table with no index", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec("CREATE%s TABLE t1(a INTEGER %s, b INTEGER %s, c TEXT %s);",
                  isTemp(9), g.zNN, g.zNN, g.zNN);
  speedtest1_prepare("INSERT INTO t1 VALUES(?1,?2,?3); --  %d times", n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    sqlite3_bind_int64(g.pStmt, 1, (sqlite3_int64)x1);
    sqlite3_bind_int(g.pStmt, 2, i);
    sqlite3_bind_text(g.pStmt, 3, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz;
  speedtest1_begin_test(110, "%d ordered INSERTS with one index/PK", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec(
     "CREATE%s TABLE t2(a INTEGER %s %s, b INTEGER %s, c TEXT %s) %s",
     isTemp(5), g.zNN, g.zPK, g.zNN, g.zNN, g.zWR);
  speedtest1_prepare("INSERT INTO t2 VALUES(?1,?2,?3); -- %d times", n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, i);
    sqlite3_bind_int64(g.pStmt, 2, (sqlite3_int64)x1);
    sqlite3_bind_text(g.pStmt, 3, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz;
  speedtest1_begin_test(120, "%d unordered INSERTS with one index/PK", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec(
      "CREATE%s TABLE t3(a INTEGER %s %s, b INTEGER %s, c TEXT %s) %s",
      isTemp(3), g.zNN, g.zPK, g.zNN, g.zNN, g.zWR);
  speedtest1_prepare("INSERT INTO t3 VALUES(?1,?2,?3); -- %d times", n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 2, i);
    sqlite3_bind_int64(g.pStmt, 1, (sqlite3_int64)x1);
    sqlite3_bind_text(g.pStmt, 3, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

#if SQLITE_VERSION_NUMBER<3005004
  sqlite3_create_function(g.db, "group_concat", 1, SQLITE_UTF8, 0,
                          0, groupStep, groupFinal);
#endif

  n = 25;
  speedtest1_begin_test(130, "%d SELECTS, numeric BETWEEN, unindexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM t1\n"
    " WHERE b BETWEEN ?1 AND ?2; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      x2 = speedtest1_random()%10 + sz/5000 + x1;
    }
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = 10;
  speedtest1_begin_test(140, "%d SELECTS, LIKE, unindexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM t1\n"
    " WHERE c LIKE ?1; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      zNum[0] = '%';
      len = speedtest1_numbername(i, zNum+1, sizeof(zNum)-2);
      zNum[len] = '%';
      zNum[len+1] = 0;
    }
    sqlite3_bind_text(g.pStmt, 1, zNum, len+1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = 10;
  speedtest1_begin_test(142, "%d SELECTS w/ORDER BY, unindexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT a, b, c FROM t1 WHERE c LIKE ?1\n"
    " ORDER BY a; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      zNum[0] = '%';
      len = speedtest1_numbername(i, zNum+1, sizeof(zNum)-2);
      zNum[len] = '%';
      zNum[len+1] = 0;
    }
    sqlite3_bind_text(g.pStmt, 1, zNum, len+1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  n = 10; /* g.szTest/5; */
  speedtest1_begin_test(145, "%d SELECTS w/ORDER BY and LIMIT, unindexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT a, b, c FROM t1 WHERE c LIKE ?1\n"
    " ORDER BY a LIMIT 10; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      zNum[0] = '%';
      len = speedtest1_numbername(i, zNum+1, sizeof(zNum)-2);
      zNum[len] = '%';
      zNum[len+1] = 0;
    }
    sqlite3_bind_text(g.pStmt, 1, zNum, len+1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  speedtest1_begin_test(150, "CREATE INDEX five times");
  speedtest1_exec("BEGIN;");
  speedtest1_exec("CREATE UNIQUE INDEX t1b ON t1(b);");
  speedtest1_exec("CREATE INDEX t1c ON t1(c);");
  speedtest1_exec("CREATE UNIQUE INDEX t2b ON t2(b);");
  speedtest1_exec("CREATE INDEX t2c ON t2(c DESC);");
  speedtest1_exec("CREATE INDEX t3bc ON t3(b,c);");
  speedtest1_exec("COMMIT;");
  speedtest1_end_test();


  n = sz/5;
  speedtest1_begin_test(160, "%d SELECTS, numeric BETWEEN, indexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT count(*), avg(b), sum(length(c)), group_concat(a) FROM t1\n"
    " WHERE b BETWEEN ?1 AND ?2; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      x2 = speedtest1_random()%10 + sz/5000 + x1;
    }
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz/5;
  speedtest1_begin_test(161, "%d SELECTS, numeric BETWEEN, PK", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT count(*), avg(b), sum(length(c)), group_concat(a) FROM t2\n"
    " WHERE a BETWEEN ?1 AND ?2; -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = speedtest1_random()%maxb;
      x2 = speedtest1_random()%10 + sz/5000 + x1;
    }
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz/5;
  speedtest1_begin_test(170, "%d SELECTS, text BETWEEN, indexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT count(*), avg(b), sum(length(c)), group_concat(a) FROM t1\n"
    " WHERE c BETWEEN ?1 AND (?1||'~'); -- %d times", n
  );
  for(i=1; i<=n; i++){
    if( (i-1)%g.nRepeat==0 ){
      x1 = swizzle(i, maxb);
      len = speedtest1_numbername(x1, zNum, sizeof(zNum)-1);
    }
    sqlite3_bind_text(g.pStmt, 1, zNum, len, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  n = sz;
  speedtest1_begin_test(180, "%d INSERTS with three indexes", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec(
    "CREATE%s TABLE t4(\n"
    "  a INTEGER %s %s,\n"
    "  b INTEGER %s,\n"
    "  c TEXT %s\n"
    ") %s",
    isTemp(1), g.zNN, g.zPK, g.zNN, g.zNN, g.zWR);
  speedtest1_exec("CREATE INDEX t4b ON t4(b)");
  speedtest1_exec("CREATE INDEX t4c ON t4(c)");
  speedtest1_exec("INSERT INTO t4 SELECT * FROM t1");
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  n = sz;
  speedtest1_begin_test(190, "DELETE and REFILL one table", n);
  speedtest1_exec("DELETE FROM t2;");
  speedtest1_exec("INSERT INTO t2 SELECT * FROM t1;");
  speedtest1_end_test();


  speedtest1_begin_test(200, "VACUUM");
  speedtest1_exec("VACUUM");
  speedtest1_end_test();


  speedtest1_begin_test(210, "ALTER TABLE ADD COLUMN, and query");
  speedtest1_exec("ALTER TABLE t2 ADD COLUMN d DEFAULT 123");
  speedtest1_exec("SELECT sum(d) FROM t2");
  speedtest1_end_test();


  n = sz/5;
  speedtest1_begin_test(230, "%d UPDATES, numeric BETWEEN, indexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "UPDATE t2 SET d=b*2 WHERE b BETWEEN ?1 AND ?2; -- %d times", n
  );
  for(i=1; i<=n; i++){
    x1 = speedtest1_random()%maxb;
    x2 = speedtest1_random()%10 + sz/5000 + x1;
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz;
  speedtest1_begin_test(240, "%d UPDATES of individual rows", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "UPDATE t2 SET d=b*3 WHERE a=?1; -- %d times", n
  );
  for(i=1; i<=n; i++){
    x1 = speedtest1_random()%sz + 1;
    sqlite3_bind_int(g.pStmt, 1, x1);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  speedtest1_begin_test(250, "One big UPDATE of the whole %d-row table", sz);
  speedtest1_exec("UPDATE t2 SET d=b*4");
  speedtest1_end_test();


  speedtest1_begin_test(260, "Query added column after filling");
  speedtest1_exec("SELECT sum(d) FROM t2");
  speedtest1_end_test();



  n = sz/5;
  speedtest1_begin_test(270, "%d DELETEs, numeric BETWEEN, indexed", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "DELETE FROM t2 WHERE b BETWEEN ?1 AND ?2; -- %d times", n
  );
  for(i=1; i<=n; i++){
    x1 = speedtest1_random()%maxb + 1;
    x2 = speedtest1_random()%10 + sz/5000 + x1;
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  n = sz;
  speedtest1_begin_test(280, "%d DELETEs of individual rows", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "DELETE FROM t3 WHERE a=?1; -- %d times", n
  );
  for(i=1; i<=n; i++){
    x1 = speedtest1_random()%sz + 1;
    sqlite3_bind_int(g.pStmt, 1, x1);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();


  speedtest1_begin_test(290, "Refill two %d-row tables using REPLACE", sz);
  speedtest1_exec("REPLACE INTO t2(a,b,c) SELECT a,b,c FROM t1");
  speedtest1_exec("REPLACE INTO t3(a,b,c) SELECT a,b,c FROM t1");
  speedtest1_end_test();

  speedtest1_begin_test(300, "Refill a %d-row table using (b&1)==(a&1)", sz);
  speedtest1_exec("DELETE FROM t2;");
  speedtest1_exec("INSERT INTO t2(a,b,c)\n"
                  " SELECT a,b,c FROM t1  WHERE (b&1)==(a&1);");
  speedtest1_exec("INSERT INTO t2(a,b,c)\n"
                  " SELECT a,b,c FROM t1  WHERE (b&1)<>(a&1);");
  speedtest1_end_test();


  n = sz/5;
  speedtest1_begin_test(310, "%d four-ways joins", n);
  speedtest1_exec("BEGIN");
  speedtest1_prepare(
    "SELECT t1.c FROM t1, t2, t3, t4\n"
    " WHERE t4.a BETWEEN ?1 AND ?2\n"
    "   AND t3.a=t4.b\n"
    "   AND t2.a=t3.b\n"
    "   AND t1.c=t2.c"
  );
  for(i=1; i<=n; i++){
    x1 = speedtest1_random()%sz + 1;
    x2 = speedtest1_random()%10 + x1 + 4;
    sqlite3_bind_int(g.pStmt, 1, x1);
    sqlite3_bind_int(g.pStmt, 2, x2);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  speedtest1_begin_test(320, "subquery in result set", n);
  speedtest1_prepare(
    "SELECT sum(a), max(c),\n"
    "       avg((SELECT a FROM t2 WHERE 5+t2.b=t1.b) AND rowid<?1), max(c)\n"
    " FROM t1 WHERE rowid<?1;"
  );
  sqlite3_bind_int(g.pStmt, 1, est_square_root(g.szTest)*50);
  speedtest1_run();
  speedtest1_end_test();

  sz = n = g.szTest*700;
  zNum[0] = 0;
  maxb = roundup_allones(sz/3);
  speedtest1_begin_test(400, "%d REPLACE ops on an IPK", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec("CREATE%s TABLE t5(a INTEGER PRIMARY KEY, b %s);",
                  isTemp(9), g.zNN);
  speedtest1_prepare("REPLACE INTO t5 VALUES(?1,?2); --  %d times",n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(i, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, (sqlite3_int64)x1);
    sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();
  speedtest1_begin_test(410, "%d SELECTS on an IPK", n);
  speedtest1_prepare("SELECT b FROM t5 WHERE a=?1; --  %d times",n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    sqlite3_bind_int(g.pStmt, 1, (sqlite3_int64)x1);
    speedtest1_run();
  }
  speedtest1_end_test();

  sz = n = g.szTest*700;
  zNum[0] = 0;
  maxb = roundup_allones(sz/3);
  speedtest1_begin_test(500, "%d REPLACE on TEXT PK", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec("CREATE%s TABLE t6(a TEXT PRIMARY KEY, b %s)%s;",
                  isTemp(9), g.zNN,
                  sqlite3_libversion_number()>=3008002 ? "WITHOUT ROWID" : "");
  speedtest1_prepare("REPLACE INTO t6 VALUES(?1,?2); --  %d times",n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 2, i);
    sqlite3_bind_text(g.pStmt, 1, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();
  speedtest1_begin_test(510, "%d SELECTS on a TEXT PK", n);
  speedtest1_prepare("SELECT b FROM t6 WHERE a=?1; --  %d times",n);
  for(i=1; i<=n; i++){
    x1 = swizzle(i,maxb);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    sqlite3_bind_text(g.pStmt, 1, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_end_test();
  speedtest1_begin_test(520, "%d SELECT DISTINCT", n);
  speedtest1_exec("SELECT DISTINCT b FROM t5;");
  speedtest1_exec("SELECT DISTINCT b FROM t6;");
  speedtest1_end_test();


  speedtest1_begin_test(980, "PRAGMA integrity_check");
  speedtest1_exec("PRAGMA integrity_check");
  speedtest1_end_test();


  speedtest1_begin_test(990, "ANALYZE");
  speedtest1_exec("ANALYZE");
  speedtest1_end_test();
}

/*
** A testset for common table expressions.  This exercises code
** for views, subqueries, co-routines, etc.
*/
void testset_cte(void){
  static const char *azPuzzle[] = {
    /* Easy */
    "534...9.."
    "67.195..."
    ".98....6."
    "8...6...3"
    "4..8.3..1"
    "....2...6"
    ".6....28."
    "...419..5"
    "...28..79",

    /* Medium */
    "53....9.."
    "6..195..."
    ".98....6."
    "8...6...3"
    "4..8.3..1"
    "....2...6"
    ".6....28."
    "...419..5"
    "....8..79",

    /* Hard */
    "53......."
    "6..195..."
    ".98....6."
    "8...6...3"
    "4..8.3..1"
    "....2...6"
    ".6....28."
    "...419..5"
    "....8..79",
  };
  const char *zPuz;
  double rSpacing;
  int nElem;

  if( g.szTest<25 ){
    zPuz = azPuzzle[0];
  }else if( g.szTest<70 ){
    zPuz = azPuzzle[1];
  }else{
    zPuz = azPuzzle[2];
  }
  speedtest1_begin_test(100, "Sudoku with recursive 'digits'");
  speedtest1_prepare(
    "WITH RECURSIVE\n"
    "  input(sud) AS (VALUES(?1)),\n"
    "  digits(z,lp) AS (\n"
    "    VALUES('1', 1)\n"
    "    UNION ALL\n"
    "    SELECT CAST(lp+1 AS TEXT), lp+1 FROM digits WHERE lp<9\n"
    "  ),\n"
    "  x(s, ind) AS (\n"
    "    SELECT sud, instr(sud, '.') FROM input\n"
    "    UNION ALL\n"
    "    SELECT\n"
    "      substr(s, 1, ind-1) || z || substr(s, ind+1),\n"
    "      instr( substr(s, 1, ind-1) || z || substr(s, ind+1), '.' )\n"
    "     FROM x, digits AS z\n"
    "    WHERE ind>0\n"
    "      AND NOT EXISTS (\n"
    "            SELECT 1\n"
    "              FROM digits AS lp\n"
    "             WHERE z.z = substr(s, ((ind-1)/9)*9 + lp, 1)\n"
    "                OR z.z = substr(s, ((ind-1)%%9) + (lp-1)*9 + 1, 1)\n"
    "                OR z.z = substr(s, (((ind-1)/3) %% 3) * 3\n"
    "                        + ((ind-1)/27) * 27 + lp\n"
    "                        + ((lp-1) / 3) * 6, 1)\n"
    "         )\n"
    "  )\n"
    "SELECT s FROM x WHERE ind=0;"
  );
  sqlite3_bind_text(g.pStmt, 1, zPuz, -1, SQLITE_STATIC);
  speedtest1_run();
  speedtest1_end_test();

  speedtest1_begin_test(200, "Sudoku with VALUES 'digits'");
  speedtest1_prepare(
    "WITH RECURSIVE\n"
    "  input(sud) AS (VALUES(?1)),\n"
    "  digits(z,lp) AS (VALUES('1',1),('2',2),('3',3),('4',4),('5',5),\n"
    "                         ('6',6),('7',7),('8',8),('9',9)),\n"
    "  x(s, ind) AS (\n"
    "    SELECT sud, instr(sud, '.') FROM input\n"
    "    UNION ALL\n"
    "    SELECT\n"
    "      substr(s, 1, ind-1) || z || substr(s, ind+1),\n"
    "      instr( substr(s, 1, ind-1) || z || substr(s, ind+1), '.' )\n"
    "     FROM x, digits AS z\n"
    "    WHERE ind>0\n"
    "      AND NOT EXISTS (\n"
    "            SELECT 1\n"
    "              FROM digits AS lp\n"
    "             WHERE z.z = substr(s, ((ind-1)/9)*9 + lp, 1)\n"
    "                OR z.z = substr(s, ((ind-1)%%9) + (lp-1)*9 + 1, 1)\n"
    "                OR z.z = substr(s, (((ind-1)/3) %% 3) * 3\n"
    "                        + ((ind-1)/27) * 27 + lp\n"
    "                        + ((lp-1) / 3) * 6, 1)\n"
    "         )\n"
    "  )\n"
    "SELECT s FROM x WHERE ind=0;"
  );
  sqlite3_bind_text(g.pStmt, 1, zPuz, -1, SQLITE_STATIC);
  speedtest1_run();
  speedtest1_end_test();

  rSpacing = 5.0/g.szTest;
  speedtest1_begin_test(300, "Mandelbrot Set with spacing=%f", rSpacing);
  speedtest1_prepare(
   "WITH RECURSIVE \n"
   "  xaxis(x) AS (VALUES(-2.0) UNION ALL SELECT x+?1 FROM xaxis WHERE x<1.2),\n"
   "  yaxis(y) AS (VALUES(-1.0) UNION ALL SELECT y+?2 FROM yaxis WHERE y<1.0),\n"
   "  m(iter, cx, cy, x, y) AS (\n"
   "    SELECT 0, x, y, 0.0, 0.0 FROM xaxis, yaxis\n"
   "    UNION ALL\n"
   "    SELECT iter+1, cx, cy, x*x-y*y + cx, 2.0*x*y + cy FROM m \n"
   "     WHERE (x*x + y*y) < 4.0 AND iter<28\n"
   "  ),\n"
   "  m2(iter, cx, cy) AS (\n"
   "    SELECT max(iter), cx, cy FROM m GROUP BY cx, cy\n"
   "  ),\n"
   "  a(t) AS (\n"
   "    SELECT group_concat( substr(' .+*#', 1+min(iter/7,4), 1), '') \n"
   "    FROM m2 GROUP BY cy\n"
   "  )\n"
   "SELECT group_concat(rtrim(t),x'0a') FROM a;"
  );
  sqlite3_bind_double(g.pStmt, 1, rSpacing*.05);
  sqlite3_bind_double(g.pStmt, 2, rSpacing);
  speedtest1_run();
  speedtest1_end_test();

  nElem = 10000*g.szTest;
  speedtest1_begin_test(400, "EXCEPT operator on %d-element tables", nElem);
  speedtest1_prepare(
    "WITH RECURSIVE \n"
    "  t1(x) AS (VALUES(2) UNION ALL SELECT x+2 FROM t1 WHERE x<%d),\n"
    "  t2(y) AS (VALUES(3) UNION ALL SELECT y+3 FROM t2 WHERE y<%d)\n"
    "SELECT count(x), avg(x) FROM (\n"
    "  SELECT x FROM t1 EXCEPT SELECT y FROM t2 ORDER BY 1\n"
    ");",
    nElem, nElem
  );
  speedtest1_run();
  speedtest1_end_test();
}

/*
** Compute a pseudo-random floating point ascii number.
*/
void speedtest1_random_ascii_fp(char *zFP){
  int x = speedtest1_random();
  int y = speedtest1_random();
  int z;
  z = y%10;
  if( z<0 ) z = -z;
  y /= 10;
  sqlite3_snprintf(100,zFP,"%d.%de%d",y,z,x%200);
}

/*
** A testset for floating-point numbers.
*/
void testset_fp(void){
  int n;
  int i;
  char zFP1[100];
  char zFP2[100];
  
  n = g.szTest*5000;
  speedtest1_begin_test(100, "Fill a table with %d FP values", n*2);
  speedtest1_exec("BEGIN");
  speedtest1_exec("CREATE%s TABLE t1(a REAL %s, b REAL %s);",
                  isTemp(1), g.zNN, g.zNN);
  speedtest1_prepare("INSERT INTO t1 VALUES(?1,?2); -- %d times", n);
  for(i=1; i<=n; i++){
    speedtest1_random_ascii_fp(zFP1);
    speedtest1_random_ascii_fp(zFP2);
    sqlite3_bind_text(g.pStmt, 1, zFP1, -1, SQLITE_STATIC);
    sqlite3_bind_text(g.pStmt, 2, zFP2, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  n = g.szTest/25 + 2;
  speedtest1_begin_test(110, "%d range queries", n);
  speedtest1_prepare("SELECT sum(b) FROM t1 WHERE a BETWEEN ?1 AND ?2");
  for(i=1; i<=n; i++){
    speedtest1_random_ascii_fp(zFP1);
    speedtest1_random_ascii_fp(zFP2);
    sqlite3_bind_text(g.pStmt, 1, zFP1, -1, SQLITE_STATIC);
    sqlite3_bind_text(g.pStmt, 2, zFP2, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_end_test();

  speedtest1_begin_test(120, "CREATE INDEX three times");
  speedtest1_exec("BEGIN;");
  speedtest1_exec("CREATE INDEX t1a ON t1(a);");
  speedtest1_exec("CREATE INDEX t1b ON t1(b);");
  speedtest1_exec("CREATE INDEX t1ab ON t1(a,b);");
  speedtest1_exec("COMMIT;");
  speedtest1_end_test();

  n = g.szTest/3 + 2;
  speedtest1_begin_test(130, "%d indexed range queries", n);
  speedtest1_prepare("SELECT sum(b) FROM t1 WHERE a BETWEEN ?1 AND ?2");
  for(i=1; i<=n; i++){
    speedtest1_random_ascii_fp(zFP1);
    speedtest1_random_ascii_fp(zFP2);
    sqlite3_bind_text(g.pStmt, 1, zFP1, -1, SQLITE_STATIC);
    sqlite3_bind_text(g.pStmt, 2, zFP2, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_end_test();

  n = g.szTest*5000;
  speedtest1_begin_test(140, "%d calls to round()", n);
  speedtest1_exec("SELECT sum(round(a,2)+round(b,4)) FROM t1;");
  speedtest1_end_test();


  speedtest1_begin_test(150, "%d printf() calls", n*4);
  speedtest1_exec(
    "WITH c(fmt) AS (VALUES('%%g'),('%%e'),('%%!g'),('%%.20f'))"
    "SELECT sum(printf(fmt,a)) FROM t1, c"
  );
  speedtest1_end_test();
}

#ifdef SQLITE_ENABLE_RTREE
/* Generate two numbers between 1 and mx.  The first number is less than
** the second.  Usually the numbers are near each other but can sometimes
** be far apart.
*/
static void twoCoords(
  int p1, int p2,                   /* Parameters adjusting sizes */
  unsigned mx,                      /* Range of 1..mx */
  unsigned *pX0, unsigned *pX1      /* OUT: write results here */
){
  unsigned d, x0, x1, span;

  span = mx/100 + 1;
  if( speedtest1_random()%3==0 ) span *= p1;
  if( speedtest1_random()%p2==0 ) span = mx/2;
  d = speedtest1_random()%span + 1;
  x0 = speedtest1_random()%(mx-d) + 1;
  x1 = x0 + d;
  *pX0 = x0;
  *pX1 = x1;
}
#endif

#ifdef SQLITE_ENABLE_RTREE
/* The following routine is an R-Tree geometry callback.  It returns
** true if the object overlaps a slice on the Y coordinate between the
** two values given as arguments.  In other words
**
**     SELECT count(*) FROM rt1 WHERE id MATCH xslice(10,20);
**
** Is the same as saying:
**
**     SELECT count(*) FROM rt1 WHERE y1>=10 AND y0<=20;
*/
static int xsliceGeometryCallback(
  sqlite3_rtree_geometry *p,
  int nCoord,
  double *aCoord,
  int *pRes
){
  *pRes = aCoord[3]>=p->aParam[0] && aCoord[2]<=p->aParam[1];
  return SQLITE_OK;
}
#endif /* SQLITE_ENABLE_RTREE */

#ifdef SQLITE_ENABLE_RTREE
/*
** A testset for the R-Tree virtual table
*/
void testset_rtree(int p1, int p2){
  unsigned i, n;
  unsigned mxCoord;
  unsigned x0, x1, y0, y1, z0, z1;
  unsigned iStep;
  unsigned mxRowid;
  int *aCheck = sqlite3_malloc( sizeof(int)*g.szTest*500 );

  mxCoord = 15000;
  mxRowid = n = g.szTest*500;
  speedtest1_begin_test(100, "%d INSERTs into an r-tree", n);
  speedtest1_exec("BEGIN");
  speedtest1_exec("CREATE VIRTUAL TABLE rt1 USING rtree(id,x0,x1,y0,y1,z0,z1)");
  speedtest1_prepare("INSERT INTO rt1(id,x0,x1,y0,y1,z0,z1)"
                     "VALUES(?1,?2,?3,?4,?5,?6,?7)");
  for(i=1; i<=n; i++){
    twoCoords(p1, p2, mxCoord, &x0, &x1);
    twoCoords(p1, p2, mxCoord, &y0, &y1);
    twoCoords(p1, p2, mxCoord, &z0, &z1);
    sqlite3_bind_int(g.pStmt, 1, i);
    sqlite3_bind_int(g.pStmt, 2, x0);
    sqlite3_bind_int(g.pStmt, 3, x1);
    sqlite3_bind_int(g.pStmt, 4, y0);
    sqlite3_bind_int(g.pStmt, 5, y1);
    sqlite3_bind_int(g.pStmt, 6, z0);
    sqlite3_bind_int(g.pStmt, 7, z1);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  speedtest1_begin_test(101, "Copy from rtree to a regular table");
  speedtest1_exec("CREATE TABLE t1(id INTEGER PRIMARY KEY,x0,x1,y0,y1,z0,z1)");
  speedtest1_exec("INSERT INTO t1 SELECT * FROM rt1");
  speedtest1_end_test();

  n = g.szTest*200;
  speedtest1_begin_test(110, "%d one-dimensional intersect slice queries", n);
  speedtest1_prepare("SELECT count(*) FROM rt1 WHERE x0>=?1 AND x1<=?2");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
    speedtest1_run();
    aCheck[i] = atoi(g.zResult);
  }
  speedtest1_end_test();

  if( g.bVerify ){
    n = g.szTest*200;
    speedtest1_begin_test(111, "Verify result from 1-D intersect slice queries");
    speedtest1_prepare("SELECT count(*) FROM t1 WHERE x0>=?1 AND x1<=?2");
    iStep = mxCoord/n;
    for(i=0; i<n; i++){
      sqlite3_bind_int(g.pStmt, 1, i*iStep);
      sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
      speedtest1_run();
      if( aCheck[i]!=atoi(g.zResult) ){
        fatal_error("Count disagree step %d: %d..%d.  %d vs %d",
                    i, i*iStep, (i+1)*iStep, aCheck[i], atoi(g.zResult));
      }
    }
    speedtest1_end_test();
  }
  
  n = g.szTest*200;
  speedtest1_begin_test(120, "%d one-dimensional overlap slice queries", n);
  speedtest1_prepare("SELECT count(*) FROM rt1 WHERE y1>=?1 AND y0<=?2");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
    speedtest1_run();
    aCheck[i] = atoi(g.zResult);
  }
  speedtest1_end_test();

  if( g.bVerify ){
    n = g.szTest*200;
    speedtest1_begin_test(121, "Verify result from 1-D overlap slice queries");
    speedtest1_prepare("SELECT count(*) FROM t1 WHERE y1>=?1 AND y0<=?2");
    iStep = mxCoord/n;
    for(i=0; i<n; i++){
      sqlite3_bind_int(g.pStmt, 1, i*iStep);
      sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
      speedtest1_run();
      if( aCheck[i]!=atoi(g.zResult) ){
        fatal_error("Count disagree step %d: %d..%d.  %d vs %d",
                    i, i*iStep, (i+1)*iStep, aCheck[i], atoi(g.zResult));
      }
    }
    speedtest1_end_test();
  }
  

  n = g.szTest*200;
  speedtest1_begin_test(125, "%d custom geometry callback queries", n);
  sqlite3_rtree_geometry_callback(g.db, "xslice", xsliceGeometryCallback, 0);
  speedtest1_prepare("SELECT count(*) FROM rt1 WHERE id MATCH xslice(?1,?2)");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
    speedtest1_run();
    if( aCheck[i]!=atoi(g.zResult) ){
      fatal_error("Count disagree step %d: %d..%d.  %d vs %d",
                  i, i*iStep, (i+1)*iStep, aCheck[i], atoi(g.zResult));
    }
  }
  speedtest1_end_test();

  n = g.szTest*400;
  speedtest1_begin_test(130, "%d three-dimensional intersect box queries", n);
  speedtest1_prepare("SELECT count(*) FROM rt1 WHERE x1>=?1 AND x0<=?2"
                     " AND y1>=?1 AND y0<=?2 AND z1>=?1 AND z0<=?2");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    sqlite3_bind_int(g.pStmt, 2, (i+1)*iStep);
    speedtest1_run();
    aCheck[i] = atoi(g.zResult);
  }
  speedtest1_end_test();

  n = g.szTest*500;
  speedtest1_begin_test(140, "%d rowid queries", n);
  speedtest1_prepare("SELECT * FROM rt1 WHERE id=?1");
  for(i=1; i<=n; i++){
    sqlite3_bind_int(g.pStmt, 1, i);
    speedtest1_run();
  }
  speedtest1_end_test();

  n = g.szTest*50;
  speedtest1_begin_test(150, "%d UPDATEs using rowid", n);
  speedtest1_prepare("UPDATE rt1 SET x0=x0+100, x1=x1+100 WHERE id=?1");
  for(i=1; i<=n; i++){
    sqlite3_bind_int(g.pStmt, 1, (i*251)%mxRowid + 1);
    speedtest1_run();
  }
  speedtest1_end_test();

  n = g.szTest*5;
  speedtest1_begin_test(155, "%d UPDATEs using one-dimensional overlap", n);
  speedtest1_prepare("UPDATE rt1 SET x0=x0-100, x1=x1-100"
                     " WHERE y1>=?1 AND y0<=?1+5");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    speedtest1_run();
    aCheck[i] = atoi(g.zResult);
  }
  speedtest1_end_test();

  n = g.szTest*50;
  speedtest1_begin_test(160, "%d DELETEs using rowid", n);
  speedtest1_prepare("DELETE FROM rt1 WHERE id=?1");
  for(i=1; i<=n; i++){
    sqlite3_bind_int(g.pStmt, 1, (i*257)%mxRowid + 1);
    speedtest1_run();
  }
  speedtest1_end_test();


  n = g.szTest*5;
  speedtest1_begin_test(165, "%d DELETEs using one-dimensional overlap", n);
  speedtest1_prepare("DELETE FROM rt1 WHERE y1>=?1 AND y0<=?1+5");
  iStep = mxCoord/n;
  for(i=0; i<n; i++){
    sqlite3_bind_int(g.pStmt, 1, i*iStep);
    speedtest1_run();
    aCheck[i] = atoi(g.zResult);
  }
  speedtest1_end_test();

  speedtest1_begin_test(170, "Restore deleted entries using INSERT OR IGNORE");
  speedtest1_exec("INSERT OR IGNORE INTO rt1 SELECT * FROM t1");
  speedtest1_end_test();
}
#endif /* SQLITE_ENABLE_RTREE */

/*
** A testset that does key/value storage on tables with many columns.
** This is the kind of workload generated by ORMs such as CoreData.
*/
void testset_orm(void){
  unsigned i, j, n;
  unsigned nRow;
  unsigned x1, len;
  char zNum[2000];              /* A number name */
  static const char zType[] =   /* Types for all non-PK columns, in order */
    "IBBIIITIVVITBTBFBFITTFBTBVBVIFTBBFITFFVBIFIVBVVVBTVTIBBFFIVIBTB"
    "TVTTFTVTVFFIITIFBITFTTFFFVBIIBTTITFTFFVVVFIIITVBBVFFTVVB";

  nRow = n = g.szTest*250;
  speedtest1_begin_test(100, "Fill %d rows", n);
  speedtest1_exec(
    "BEGIN;"
    "CREATE TABLE ZLOOKSLIKECOREDATA ("
    "  ZPK INTEGER PRIMARY KEY,"
    "  ZTERMFITTINGHOUSINGCOMMAND INTEGER,"
    "  ZBRIEFGOBYDODGERHEIGHT BLOB,"
    "  ZCAPABLETRIPDOORALMOND BLOB,"
    "  ZDEPOSITPAIRCOLLEGECOMET INTEGER,"
    "  ZFRAMEENTERSIMPLEMOUTH INTEGER,"
    "  ZHOPEFULGATEHOLECHALK INTEGER,"
    "  ZSLEEPYUSERGRANDBOWL TIMESTAMP,"
    "  ZDEWPEACHCAREERCELERY INTEGER,"
    "  ZHANGERLITHIUMDINNERMEET VARCHAR,"
    "  ZCLUBRELEASELIZARDADVICE VARCHAR,"
    "  ZCHARGECLICKHUMANEHIRE INTEGER,"
    "  ZFINGERDUEPIZZAOPTION TIMESTAMP,"
    "  ZFLYINGDOCTORTABLEMELODY BLOB,"
    "  ZLONGFINLEAVEIMAGEOIL TIMESTAMP,"
    "  ZFAMILYVISUALOWNERMATTER BLOB,"
    "  ZGOLDYOUNGINITIALNOSE FLOAT,"
    "  ZCAUSESALAMITERMCYAN BLOB,"
    "  ZSPREADMOTORBISCUITBACON FLOAT,"
    "  ZGIFTICEFISHGLUEHAIR INTEGER,"
    "  ZNOTICEPEARPOLICYJUICE TIMESTAMP,"
    "  ZBANKBUFFALORECOVERORBIT TIMESTAMP,"
    "  ZLONGDIETESSAYNATURE FLOAT,"
    "  ZACTIONRANGEELEGANTNEUTRON BLOB,"
    "  ZCADETBRIGHTPLANETBANK TIMESTAMP,"
    "  ZAIRFORGIVEHEADFROG BLOB,"
    "  ZSHARKJUSTFRUITMOVIE VARCHAR,"
    "  ZFARMERMORNINGMIRRORCONCERN BLOB,"
    "  ZWOODPOETRYCOBBLERBENCH VARCHAR,"
    "  ZHAFNIUMSCRIPTSALADMOTOR INTEGER,"
    "  ZPROBLEMCLUBPOPOVERJELLY FLOAT,"
    "  ZEIGHTLEADERWORKERMOST TIMESTAMP,"
    "  ZGLASSRESERVEBARIUMMEAL BLOB,"
    "  ZCLAMBITARUGULAFAJITA BLOB,"
    "  ZDECADEJOYOUSWAVEHABIT FLOAT,"
    "  ZCOMPANYSUMMERFIBERELF INTEGER,"
    "  ZTREATTESTQUILLCHARGE TIMESTAMP,"
    "  ZBROWBALANCEKEYCHOWDER FLOAT,"
    "  ZPEACHCOPPERDINNERLAKE FLOAT,"
    "  ZDRYWALLBEYONDBROWNBOWL VARCHAR,"
    "  ZBELLYCRASHITEMLACK BLOB,"
    "  ZTENNISCYCLEBILLOFFICER INTEGER,"
    "  ZMALLEQUIPTHANKSGLUE FLOAT,"
    "  ZMISSREPLYHUMANLIVING INTEGER,"
    "  ZKIWIVISUALPRIDEAPPLE VARCHAR,"
    "  ZWISHHITSKINMOTOR BLOB,"
    "  ZCALMRACCOONPROGRAMDEBIT VARCHAR,"
    "  ZSHINYASSISTLIVINGCRAB VARCHAR,"
    "  ZRESOLVEWRISTWRAPAPPLE VARCHAR,"
    "  ZAPPEALSIMPLESECONDHOUSING BLOB,"
    "  ZCORNERANCHORTAPEDIVER TIMESTAMP,"
    "  ZMEMORYREQUESTSOURCEBIG VARCHAR,"
    "  ZTRYFACTKEEPMILK TIMESTAMP,"
    "  ZDIVERPAINTLEATHEREASY INTEGER,"
    "  ZSORTMISTYQUOTECABBAGE BLOB,"
    "  ZTUNEGASBUFFALOCAPITAL BLOB,"
    "  ZFILLSTOPLAWJOYFUL FLOAT,"
    "  ZSTEELCAREFULPLATENUMBER FLOAT,"
    "  ZGIVEVIVIDDIVINEMEANING INTEGER,"
    "  ZTREATPACKFUTURECONVERT VARCHAR,"
    "  ZCALMLYGEMFINISHEFFECT INTEGER,"
    "  ZCABBAGESOCKEASEMINUTE BLOB,"
    "  ZPLANETFAMILYPUREMEMORY TIMESTAMP,"
    "  ZMERRYCRACKTRAINLEADER BLOB,"
    "  ZMINORWAYPAPERCLASSY TIMESTAMP,"
    "  ZEAGLELINEMINEMAIL VARCHAR,"
    "  ZRESORTYARDGREENLET TIMESTAMP,"
    "  ZYARDOREGANOVIVIDJEWEL TIMESTAMP,"
    "  ZPURECAKEVIVIDNEATLY FLOAT,"
    "  ZASKCONTACTMONITORFUN TIMESTAMP,"
    "  ZMOVEWHOGAMMAINCH VARCHAR,"
    "  ZLETTUCEBIRDMEETDEBATE TIMESTAMP,"
    "  ZGENENATURALHEARINGKITE VARCHAR,"
    "  ZMUFFINDRYERDRAWFORTUNE FLOAT,"
    "  ZGRAYSURVEYWIRELOVE FLOAT,"
    "  ZPLIERSPRINTASKOREGANO INTEGER,"
    "  ZTRAVELDRIVERCONTESTLILY INTEGER,"
    "  ZHUMORSPICESANDKIDNEY TIMESTAMP,"
    "  ZARSENICSAMPLEWAITMUON INTEGER,"
    "  ZLACEADDRESSGROUNDCAREFUL FLOAT,"
    "  ZBAMBOOMESSWASABIEVENING BLOB,"
    "  ZONERELEASEAVERAGENURSE INTEGER,"
    "  ZRADIANTWHENTRYCARD TIMESTAMP,"
    "  ZREWARDINSIDEMANGOINTENSE FLOAT,"
    "  ZNEATSTEWPARTIRON TIMESTAMP,"
    "  ZOUTSIDEPEAHENCOUNTICE TIMESTAMP,"
    "  ZCREAMEVENINGLIPBRANCH FLOAT,"
    "  ZWHALEMATHAVOCADOCOPPER FLOAT,"
    "  ZLIFEUSELEAFYBELL FLOAT,"
    "  ZWEALTHLINENGLEEFULDAY VARCHAR,"
    "  ZFACEINVITETALKGOLD BLOB,"
    "  ZWESTAMOUNTAFFECTHEARING INTEGER,"
    "  ZDELAYOUTCOMEHORNAGENCY INTEGER,"
    "  ZBIGTHINKCONVERTECONOMY BLOB,"
    "  ZBASEGOUDAREGULARFORGIVE TIMESTAMP,"
    "  ZPATTERNCLORINEGRANDCOLBY TIMESTAMP,"
    "  ZCYANBASEFEEDADROIT INTEGER,"
    "  ZCARRYFLOORMINNOWDRAGON TIMESTAMP,"
    "  ZIMAGEPENCILOTHERBOTTOM FLOAT,"
    "  ZXENONFLIGHTPALEAPPLE TIMESTAMP,"
    "  ZHERRINGJOKEFEATUREHOPEFUL FLOAT,"
    "  ZCAPYEARLYRIVETBRUSH FLOAT,"
    "  ZAGEREEDFROGBASKET VARCHAR,"
    "  ZUSUALBODYHALIBUTDIAMOND VARCHAR,"
    "  ZFOOTTAPWORDENTRY VARCHAR,"
    "  ZDISHKEEPBLESTMONITOR FLOAT,"
    "  ZBROADABLESOLIDCASUAL INTEGER,"
    "  ZSQUAREGLEEFULCHILDLIGHT INTEGER,"
    "  ZHOLIDAYHEADPONYDETAIL INTEGER,"
    "  ZGENERALRESORTSKYOPEN TIMESTAMP,"
    "  ZGLADSPRAYKIDNEYGUPPY VARCHAR,"
    "  ZSWIMHEAVYMENTIONKIND BLOB,"
    "  ZMESSYSULFURDREAMFESTIVE BLOB,"
    "  ZSKYSKYCLASSICBRIEF VARCHAR,"
    "  ZDILLASKHOKILEMON FLOAT,"
    "  ZJUNIORSHOWPRESSNOVA FLOAT,"
    "  ZSIZETOEAWARDFRESH TIMESTAMP,"
    "  ZKEYFAILAPRICOTMETAL VARCHAR,"
    "  ZHANDYREPAIRPROTONAIRPORT VARCHAR,"
    "  ZPOSTPROTEINHANDLEACTOR BLOB"
    ");"
  );
  speedtest1_prepare(
    "INSERT INTO ZLOOKSLIKECOREDATA(ZPK,ZAIRFORGIVEHEADFROG,"
    "ZGIFTICEFISHGLUEHAIR,ZDELAYOUTCOMEHORNAGENCY,ZSLEEPYUSERGRANDBOWL,"
    "ZGLASSRESERVEBARIUMMEAL,ZBRIEFGOBYDODGERHEIGHT,"
    "ZBAMBOOMESSWASABIEVENING,ZFARMERMORNINGMIRRORCONCERN,"
    "ZTREATPACKFUTURECONVERT,ZCAUSESALAMITERMCYAN,ZCALMRACCOONPROGRAMDEBIT,"
    "ZHOLIDAYHEADPONYDETAIL,ZWOODPOETRYCOBBLERBENCH,ZHAFNIUMSCRIPTSALADMOTOR,"
    "ZUSUALBODYHALIBUTDIAMOND,ZOUTSIDEPEAHENCOUNTICE,ZDIVERPAINTLEATHEREASY,"
    "ZWESTAMOUNTAFFECTHEARING,ZSIZETOEAWARDFRESH,ZDEWPEACHCAREERCELERY,"
    "ZSTEELCAREFULPLATENUMBER,ZCYANBASEFEEDADROIT,ZCALMLYGEMFINISHEFFECT,"
    "ZHANDYREPAIRPROTONAIRPORT,ZGENENATURALHEARINGKITE,ZBROADABLESOLIDCASUAL,"
    "ZPOSTPROTEINHANDLEACTOR,ZLACEADDRESSGROUNDCAREFUL,ZIMAGEPENCILOTHERBOTTOM,"
    "ZPROBLEMCLUBPOPOVERJELLY,ZPATTERNCLORINEGRANDCOLBY,ZNEATSTEWPARTIRON,"
    "ZAPPEALSIMPLESECONDHOUSING,ZMOVEWHOGAMMAINCH,ZTENNISCYCLEBILLOFFICER,"
    "ZSHARKJUSTFRUITMOVIE,ZKEYFAILAPRICOTMETAL,ZCOMPANYSUMMERFIBERELF,"
    "ZTERMFITTINGHOUSINGCOMMAND,ZRESORTYARDGREENLET,ZCABBAGESOCKEASEMINUTE,"
    "ZSQUAREGLEEFULCHILDLIGHT,ZONERELEASEAVERAGENURSE,ZBIGTHINKCONVERTECONOMY,"
    "ZPLIERSPRINTASKOREGANO,ZDECADEJOYOUSWAVEHABIT,ZDRYWALLBEYONDBROWNBOWL,"
    "ZCLUBRELEASELIZARDADVICE,ZWHALEMATHAVOCADOCOPPER,ZBELLYCRASHITEMLACK,"
    "ZLETTUCEBIRDMEETDEBATE,ZCAPABLETRIPDOORALMOND,ZRADIANTWHENTRYCARD,"
    "ZCAPYEARLYRIVETBRUSH,ZAGEREEDFROGBASKET,ZSWIMHEAVYMENTIONKIND,"
    "ZTRAVELDRIVERCONTESTLILY,ZGLADSPRAYKIDNEYGUPPY,ZBANKBUFFALORECOVERORBIT,"
    "ZFINGERDUEPIZZAOPTION,ZCLAMBITARUGULAFAJITA,ZLONGFINLEAVEIMAGEOIL,"
    "ZLONGDIETESSAYNATURE,ZJUNIORSHOWPRESSNOVA,ZHOPEFULGATEHOLECHALK,"
    "ZDEPOSITPAIRCOLLEGECOMET,ZWEALTHLINENGLEEFULDAY,ZFILLSTOPLAWJOYFUL,"
    "ZTUNEGASBUFFALOCAPITAL,ZGRAYSURVEYWIRELOVE,ZCORNERANCHORTAPEDIVER,"
    "ZREWARDINSIDEMANGOINTENSE,ZCADETBRIGHTPLANETBANK,ZPLANETFAMILYPUREMEMORY,"
    "ZTREATTESTQUILLCHARGE,ZCREAMEVENINGLIPBRANCH,ZSKYSKYCLASSICBRIEF,"
    "ZARSENICSAMPLEWAITMUON,ZBROWBALANCEKEYCHOWDER,ZFLYINGDOCTORTABLEMELODY,"
    "ZHANGERLITHIUMDINNERMEET,ZNOTICEPEARPOLICYJUICE,ZSHINYASSISTLIVINGCRAB,"
    "ZLIFEUSELEAFYBELL,ZFACEINVITETALKGOLD,ZGENERALRESORTSKYOPEN,"
    "ZPURECAKEVIVIDNEATLY,ZKIWIVISUALPRIDEAPPLE,ZMESSYSULFURDREAMFESTIVE,"
    "ZCHARGECLICKHUMANEHIRE,ZHERRINGJOKEFEATUREHOPEFUL,ZYARDOREGANOVIVIDJEWEL,"
    "ZFOOTTAPWORDENTRY,ZWISHHITSKINMOTOR,ZBASEGOUDAREGULARFORGIVE,"
    "ZMUFFINDRYERDRAWFORTUNE,ZACTIONRANGEELEGANTNEUTRON,ZTRYFACTKEEPMILK,"
    "ZPEACHCOPPERDINNERLAKE,ZFRAMEENTERSIMPLEMOUTH,ZMERRYCRACKTRAINLEADER,"
    "ZMEMORYREQUESTSOURCEBIG,ZCARRYFLOORMINNOWDRAGON,ZMINORWAYPAPERCLASSY,"
    "ZDILLASKHOKILEMON,ZRESOLVEWRISTWRAPAPPLE,ZASKCONTACTMONITORFUN,"
    "ZGIVEVIVIDDIVINEMEANING,ZEIGHTLEADERWORKERMOST,ZMISSREPLYHUMANLIVING,"
    "ZXENONFLIGHTPALEAPPLE,ZSORTMISTYQUOTECABBAGE,ZEAGLELINEMINEMAIL,"
    "ZFAMILYVISUALOWNERMATTER,ZSPREADMOTORBISCUITBACON,ZDISHKEEPBLESTMONITOR,"
    "ZMALLEQUIPTHANKSGLUE,ZGOLDYOUNGINITIALNOSE,ZHUMORSPICESANDKIDNEY)"
    "VALUES(?1,?26,?20,?93,?8,?33,?3,?81,?28,?60,?18,?47,?109,?29,?30,?104,?86,"
    "?54,?92,?117,?9,?58,?97,?61,?119,?73,?107,?120,?80,?99,?31,?96,?85,?50,?71,"
    "?42,?27,?118,?36,?2,?67,?62,?108,?82,?94,?76,?35,?40,?11,?88,?41,?72,?4,"
    "?83,?102,?103,?112,?77,?111,?22,?13,?34,?15,?23,?116,?7,?5,?90,?57,?56,"
    "?75,?51,?84,?25,?63,?37,?87,?114,?79,?38,?14,?10,?21,?48,?89,?91,?110,"
    "?69,?45,?113,?12,?101,?68,?105,?46,?95,?74,?24,?53,?39,?6,?64,?52,?98,"
    "?65,?115,?49,?70,?59,?32,?44,?100,?55,?66,?16,?19,?106,?43,?17,?78);"
  );
  for(i=0; i<n; i++){
    x1 = speedtest1_random();
    speedtest1_numbername(x1%1000, zNum, sizeof(zNum));
    len = (int)strlen(zNum);
    sqlite3_bind_int(g.pStmt, 1, i^0xf);
    for(j=0; zType[j]; j++){
      switch( zType[j] ){
        case 'I':
        case 'T':
          sqlite3_bind_int64(g.pStmt, j+2, x1);
          break;
        case 'F':
          sqlite3_bind_double(g.pStmt, j+2, (double)x1);
          break;
        case 'V':
        case 'B':
          sqlite3_bind_text64(g.pStmt, j+2, zNum, len,
                              SQLITE_STATIC, SQLITE_UTF8);
          break;
      }
    }
    speedtest1_run();
  }
  speedtest1_exec("COMMIT;");
  speedtest1_end_test();

  n = g.szTest*250;
  speedtest1_begin_test(110, "Query %d rows by rowid", n);
  speedtest1_prepare(
    "SELECT ZCYANBASEFEEDADROIT,ZJUNIORSHOWPRESSNOVA,ZCAUSESALAMITERMCYAN,"
    "ZHOPEFULGATEHOLECHALK,ZHUMORSPICESANDKIDNEY,ZSWIMHEAVYMENTIONKIND,"
    "ZMOVEWHOGAMMAINCH,ZAPPEALSIMPLESECONDHOUSING,ZHAFNIUMSCRIPTSALADMOTOR,"
    "ZNEATSTEWPARTIRON,ZLONGFINLEAVEIMAGEOIL,ZDEWPEACHCAREERCELERY,"
    "ZXENONFLIGHTPALEAPPLE,ZCALMRACCOONPROGRAMDEBIT,ZUSUALBODYHALIBUTDIAMOND,"
    "ZTRYFACTKEEPMILK,ZWEALTHLINENGLEEFULDAY,ZLONGDIETESSAYNATURE,"
    "ZLIFEUSELEAFYBELL,ZTREATPACKFUTURECONVERT,ZMEMORYREQUESTSOURCEBIG,"
    "ZYARDOREGANOVIVIDJEWEL,ZDEPOSITPAIRCOLLEGECOMET,ZSLEEPYUSERGRANDBOWL,"
    "ZBRIEFGOBYDODGERHEIGHT,ZCLUBRELEASELIZARDADVICE,ZCAPABLETRIPDOORALMOND,"
    "ZDRYWALLBEYONDBROWNBOWL,ZASKCONTACTMONITORFUN,ZKIWIVISUALPRIDEAPPLE,"
    "ZNOTICEPEARPOLICYJUICE,ZPEACHCOPPERDINNERLAKE,ZSTEELCAREFULPLATENUMBER,"
    "ZGLADSPRAYKIDNEYGUPPY,ZCOMPANYSUMMERFIBERELF,ZTENNISCYCLEBILLOFFICER,"
    "ZIMAGEPENCILOTHERBOTTOM,ZWESTAMOUNTAFFECTHEARING,ZDIVERPAINTLEATHEREASY,"
    "ZSKYSKYCLASSICBRIEF,ZMESSYSULFURDREAMFESTIVE,ZMERRYCRACKTRAINLEADER,"
    "ZBROADABLESOLIDCASUAL,ZGLASSRESERVEBARIUMMEAL,ZTUNEGASBUFFALOCAPITAL,"
    "ZBANKBUFFALORECOVERORBIT,ZTREATTESTQUILLCHARGE,ZBAMBOOMESSWASABIEVENING,"
    "ZREWARDINSIDEMANGOINTENSE,ZEAGLELINEMINEMAIL,ZCALMLYGEMFINISHEFFECT,"
    "ZKEYFAILAPRICOTMETAL,ZFINGERDUEPIZZAOPTION,ZCADETBRIGHTPLANETBANK,"
    "ZGOLDYOUNGINITIALNOSE,ZMISSREPLYHUMANLIVING,ZEIGHTLEADERWORKERMOST,"
    "ZFRAMEENTERSIMPLEMOUTH,ZBIGTHINKCONVERTECONOMY,ZFACEINVITETALKGOLD,"
    "ZPOSTPROTEINHANDLEACTOR,ZHERRINGJOKEFEATUREHOPEFUL,ZCABBAGESOCKEASEMINUTE,"
    "ZMUFFINDRYERDRAWFORTUNE,ZPROBLEMCLUBPOPOVERJELLY,ZGIVEVIVIDDIVINEMEANING,"
    "ZGENENATURALHEARINGKITE,ZGENERALRESORTSKYOPEN,ZLETTUCEBIRDMEETDEBATE,"
    "ZBASEGOUDAREGULARFORGIVE,ZCHARGECLICKHUMANEHIRE,ZPLANETFAMILYPUREMEMORY,"
    "ZMINORWAYPAPERCLASSY,ZCAPYEARLYRIVETBRUSH,ZSIZETOEAWARDFRESH,"
    "ZARSENICSAMPLEWAITMUON,ZSQUAREGLEEFULCHILDLIGHT,ZSHINYASSISTLIVINGCRAB,"
    "ZCORNERANCHORTAPEDIVER,ZDECADEJOYOUSWAVEHABIT,ZTRAVELDRIVERCONTESTLILY,"
    "ZFLYINGDOCTORTABLEMELODY,ZSHARKJUSTFRUITMOVIE,ZFAMILYVISUALOWNERMATTER,"
    "ZFARMERMORNINGMIRRORCONCERN,ZGIFTICEFISHGLUEHAIR,ZOUTSIDEPEAHENCOUNTICE,"
    "ZSPREADMOTORBISCUITBACON,ZWISHHITSKINMOTOR,ZHOLIDAYHEADPONYDETAIL,"
    "ZWOODPOETRYCOBBLERBENCH,ZAIRFORGIVEHEADFROG,ZBROWBALANCEKEYCHOWDER,"
    "ZDISHKEEPBLESTMONITOR,ZCLAMBITARUGULAFAJITA,ZPLIERSPRINTASKOREGANO,"
    "ZRADIANTWHENTRYCARD,ZDELAYOUTCOMEHORNAGENCY,ZPURECAKEVIVIDNEATLY,"
    "ZPATTERNCLORINEGRANDCOLBY,ZHANDYREPAIRPROTONAIRPORT,ZAGEREEDFROGBASKET,"
    "ZSORTMISTYQUOTECABBAGE,ZFOOTTAPWORDENTRY,ZRESOLVEWRISTWRAPAPPLE,"
    "ZDILLASKHOKILEMON,ZFILLSTOPLAWJOYFUL,ZACTIONRANGEELEGANTNEUTRON,"
    "ZRESORTYARDGREENLET,ZCREAMEVENINGLIPBRANCH,ZWHALEMATHAVOCADOCOPPER,"
    "ZGRAYSURVEYWIRELOVE,ZBELLYCRASHITEMLACK,ZHANGERLITHIUMDINNERMEET,"
    "ZCARRYFLOORMINNOWDRAGON,ZMALLEQUIPTHANKSGLUE,ZTERMFITTINGHOUSINGCOMMAND,"
    "ZONERELEASEAVERAGENURSE,ZLACEADDRESSGROUNDCAREFUL"
    " FROM ZLOOKSLIKECOREDATA WHERE ZPK=?1;"
  );
  for(i=0; i<n; i++){
    x1 = speedtest1_random()%nRow;
    sqlite3_bind_int(g.pStmt, 1, x1);
    speedtest1_run();
  }
  speedtest1_end_test();
}

/*
*/
void testset_trigger(void){
  int jj, ii;
  char zNum[2000];              /* A number name */

  const int NROW  = 500*g.szTest;
  const int NROW2 = 100*g.szTest;

  speedtest1_exec(
      "BEGIN;"
      "CREATE TABLE t1(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);"
      "CREATE TABLE t2(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);"
      "CREATE TABLE t3(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);"
      "CREATE VIEW v1 AS SELECT rowid, i, t FROM t1;"
      "CREATE VIEW v2 AS SELECT rowid, i, t FROM t2;"
      "CREATE VIEW v3 AS SELECT rowid, i, t FROM t3;"
  );
  for(jj=1; jj<=3; jj++){
    speedtest1_prepare("INSERT INTO t%d VALUES(NULL,?1,?2)", jj);
    for(ii=0; ii<NROW; ii++){
      int x1 = speedtest1_random() % NROW;
      speedtest1_numbername(x1, zNum, sizeof(zNum));
      sqlite3_bind_int(g.pStmt, 1, x1);
      sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
      speedtest1_run();
    }
  }
  speedtest1_exec(
      "CREATE INDEX i1 ON t1(t);"
      "CREATE INDEX i2 ON t2(t);"
      "CREATE INDEX i3 ON t3(t);"
      "COMMIT;"
  );

  speedtest1_begin_test(100, "speed4p-join1");
  speedtest1_prepare(
      "SELECT * FROM t1, t2, t3 WHERE t1.oid = t2.oid AND t2.oid = t3.oid"
  );
  speedtest1_run();
  speedtest1_end_test();

  speedtest1_begin_test(110, "speed4p-join2");
  speedtest1_prepare(
      "SELECT * FROM t1, t2, t3 WHERE t1.t = t2.t AND t2.t = t3.t"
  );
  speedtest1_run();
  speedtest1_end_test();

  speedtest1_begin_test(120, "speed4p-view1");
  for(jj=1; jj<=3; jj++){
    speedtest1_prepare("SELECT * FROM v%d WHERE rowid = ?", jj);
    for(ii=0; ii<NROW2; ii+=3){
      sqlite3_bind_int(g.pStmt, 1, ii*3);
      speedtest1_run();
    }
  }
  speedtest1_end_test();

  speedtest1_begin_test(130, "speed4p-table1");
  for(jj=1; jj<=3; jj++){
    speedtest1_prepare("SELECT * FROM t%d WHERE rowid = ?", jj);
    for(ii=0; ii<NROW2; ii+=3){
      sqlite3_bind_int(g.pStmt, 1, ii*3);
      speedtest1_run();
    }
  }
  speedtest1_end_test();

  speedtest1_begin_test(140, "speed4p-table1");
  for(jj=1; jj<=3; jj++){
    speedtest1_prepare("SELECT * FROM t%d WHERE rowid = ?", jj);
    for(ii=0; ii<NROW2; ii+=3){
      sqlite3_bind_int(g.pStmt, 1, ii*3);
      speedtest1_run();
    }
  }
  speedtest1_end_test();

  speedtest1_begin_test(150, "speed4p-subselect1");
  speedtest1_prepare("SELECT "
      "(SELECT t FROM t1 WHERE rowid = ?1),"
      "(SELECT t FROM t2 WHERE rowid = ?1),"
      "(SELECT t FROM t3 WHERE rowid = ?1)"
  );
  for(jj=0; jj<NROW2; jj++){
    sqlite3_bind_int(g.pStmt, 1, jj*3);
    speedtest1_run();
  }
  speedtest1_end_test();

  speedtest1_begin_test(160, "speed4p-rowid-update");
  speedtest1_exec("BEGIN");
  speedtest1_prepare("UPDATE t1 SET i=i+1 WHERE rowid=?1");
  for(jj=0; jj<NROW2; jj++){
    sqlite3_bind_int(g.pStmt, 1, jj);
    speedtest1_run();
  }
  speedtest1_exec("COMMIT");
  speedtest1_end_test();

  speedtest1_exec("CREATE TABLE t5(t TEXT PRIMARY KEY, i INTEGER);");
  speedtest1_begin_test(170, "speed4p-insert-ignore");
  speedtest1_exec("INSERT OR IGNORE INTO t5 SELECT t, i FROM t1");
  speedtest1_end_test();

  speedtest1_exec(
      "CREATE TABLE log(op TEXT, r INTEGER, i INTEGER, t TEXT);"
      "CREATE TABLE t4(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);"
      "CREATE TRIGGER t4_trigger1 AFTER INSERT ON t4 BEGIN"
      "  INSERT INTO log VALUES('INSERT INTO t4', new.rowid, new.i, new.t);"
      "END;"
      "CREATE TRIGGER t4_trigger2 AFTER UPDATE ON t4 BEGIN"
      "  INSERT INTO log VALUES('UPDATE OF t4', new.rowid, new.i, new.t);"
      "END;"
      "CREATE TRIGGER t4_trigger3 AFTER DELETE ON t4 BEGIN"
      "  INSERT INTO log VALUES('DELETE OF t4', old.rowid, old.i, old.t);"
      "END;"
      "BEGIN;"
  );

  speedtest1_begin_test(180, "speed4p-trigger1");
  speedtest1_prepare("INSERT INTO t4 VALUES(NULL, ?1, ?2)");
  for(jj=0; jj<NROW2; jj++){
    speedtest1_numbername(jj, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, jj);
    sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_end_test();

  /*
  ** Note: Of the queries, only half actually update a row. This property
  ** was copied over from speed4p.test, where it was probably introduced
  ** inadvertantly.
  */
  speedtest1_begin_test(190, "speed4p-trigger2");
  speedtest1_prepare("UPDATE t4 SET i = ?1, t = ?2 WHERE rowid = ?3");
  for(jj=1; jj<=NROW2*2; jj+=2){
    speedtest1_numbername(jj*2, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, jj*2);
    sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
    sqlite3_bind_int(g.pStmt, 3, jj);
    speedtest1_run();
  }
  speedtest1_end_test();

  /*
  ** Note: Same again.
  */
  speedtest1_begin_test(200, "speed4p-trigger3");
  speedtest1_prepare("DELETE FROM t4 WHERE rowid = ?1");
  for(jj=1; jj<=NROW2*2; jj+=2){
    sqlite3_bind_int(g.pStmt, 1, jj*2);
    speedtest1_run();
  }
  speedtest1_end_test();
  speedtest1_exec("COMMIT");

  /*
  ** The following block contains the same tests as the above block that
  ** tests triggers, with one crucial difference: no triggers are defined.
  ** So the difference in speed between these tests and the preceding ones
  ** is the amount of time taken to compile and execute the trigger programs.
  */
  speedtest1_exec(
      "DROP TABLE t4;"
      "DROP TABLE log;"
      "VACUUM;"
      "CREATE TABLE t4(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);"
      "BEGIN;"
  );
  speedtest1_begin_test(210, "speed4p-notrigger1");
  speedtest1_prepare("INSERT INTO t4 VALUES(NULL, ?1, ?2)");
  for(jj=0; jj<NROW2; jj++){
    speedtest1_numbername(jj, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, jj);
    sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
    speedtest1_run();
  }
  speedtest1_end_test();
  speedtest1_begin_test(210, "speed4p-notrigger2");
  speedtest1_prepare("UPDATE t4 SET i = ?1, t = ?2 WHERE rowid = ?3");
  for(jj=1; jj<=NROW2*2; jj+=2){
    speedtest1_numbername(jj*2, zNum, sizeof(zNum));
    sqlite3_bind_int(g.pStmt, 1, jj*2);
    sqlite3_bind_text(g.pStmt, 2, zNum, -1, SQLITE_STATIC);
    sqlite3_bind_int(g.pStmt, 3, jj);
    speedtest1_run();
  }
  speedtest1_end_test();
  speedtest1_begin_test(220, "speed4p-notrigger3");
  speedtest1_prepare("DELETE FROM t4 WHERE rowid = ?1");
  for(jj=1; jj<=NROW2*2; jj+=2){
    sqlite3_bind_int(g.pStmt, 1, jj*2);
    speedtest1_run();
  }
  speedtest1_end_test();
  speedtest1_exec("COMMIT");
}

/*
** A testset used for debugging speedtest1 itself.
*/
void testset_debug1(void){
  unsigned i, n;
  unsigned x1, x2;
  char zNum[2000];              /* A number name */

  n = g.szTest;
  for(i=1; i<=n; i++){
    x1 = swizzle(i, n);
    x2 = swizzle(x1, n);
    speedtest1_numbername(x1, zNum, sizeof(zNum));
    printf("%5d %5d %5d %s\n", i, x1, x2, zNum);
  }
}

#ifdef __linux__
#include <sys/types.h>
#include <unistd.h>

/*
** Attempt to display I/O stats on Linux using /proc/PID/io
*/
static void displayLinuxIoStats(FILE *out){
  FILE *in;
  char z[200];
  sqlite3_snprintf(sizeof(z), z, "/proc/%d/io", getpid());
  in = fopen(z, "rb");
  if( in==0 ) return;
  while( fgets(z, sizeof(z), in)!=0 ){
    static const struct {
      const char *zPattern;
      const char *zDesc;
    } aTrans[] = {
      { "rchar: ",                  "Bytes received by read():" },
      { "wchar: ",                  "Bytes sent to write():"    },
      { "syscr: ",                  "Read() system calls:"      },
      { "syscw: ",                  "Write() system calls:"     },
      { "read_bytes: ",             "Bytes rcvd from storage:"  },
      { "write_bytes: ",            "Bytes sent to storage:"    },
      { "cancelled_write_bytes: ",  "Cancelled write bytes:"    },
    };
    int i;
    for(i=0; i<sizeof(aTrans)/sizeof(aTrans[0]); i++){
      int n = (int)strlen(aTrans[i].zPattern);
      if( strncmp(aTrans[i].zPattern, z, n)==0 ){
        fprintf(out, "-- %-28s %s", aTrans[i].zDesc, &z[n]);
        break;
      }
    }
  }
  fclose(in);
}   
#endif

#if SQLITE_VERSION_NUMBER<3006018
#  define sqlite3_sourceid(X) "(before 3.6.18)"
#endif

static int xCompileOptions(void *pCtx, int nVal, char **azVal, char **azCol){
  printf("-- Compile option: %s\n", azVal[0]);
  return SQLITE_OK;
}

int main(int argc, char **argv){
  int doAutovac = 0;            /* True for --autovacuum */
  int cacheSize = 0;            /* Desired cache size.  0 means default */
  int doExclusive = 0;          /* True for --exclusive */
  int nHeap = 0, mnHeap = 0;    /* Heap size from --heap */
  int doIncrvac = 0;            /* True for --incrvacuum */
  const char *zJMode = 0;       /* Journal mode */
  const char *zKey = 0;         /* Encryption key */
  int nLook = -1, szLook = 0;   /* --lookaside configuration */
  int noSync = 0;               /* True for --nosync */
  int pageSize = 0;             /* Desired page size.  0 means default */
  int nPCache = 0, szPCache = 0;/* --pcache configuration */
  int doPCache = 0;             /* True if --pcache is seen */
  int showStats = 0;            /* True for --stats */
  int nThread = 0;              /* --threads value */
  int mmapSize = 0;             /* How big of a memory map to use */
  int memDb = 0;                /* --memdb.  Use an in-memory database */
  char *zTSet = "main";         /* Which --testset torun */
  int doTrace = 0;              /* True for --trace */
  const char *zEncoding = 0;    /* --utf16be or --utf16le */
  const char *zDbName = 0;      /* Name of the test database */

  void *pHeap = 0;              /* Allocated heap space */
  void *pLook = 0;              /* Allocated lookaside space */
  void *pPCache = 0;            /* Allocated storage for pcache */
  int iCur, iHi;                /* Stats values, current and "highwater" */
  int i;                        /* Loop counter */
  int rc;                       /* API return code */

  /* Display the version of SQLite being tested */
  printf("-- Speedtest1 for SQLite %s %.48s\n",
         sqlite3_libversion(), sqlite3_sourceid());

  /* Process command-line arguments */
  g.zWR = "";
  g.zNN = "";
  g.zPK = "UNIQUE";
  g.szTest = 100;
  g.nRepeat = 1;
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( z[0]=='-' ){
      do{ z++; }while( z[0]=='-' );
      if( strcmp(z,"autovacuum")==0 ){
        doAutovac = 1;
      }else if( strcmp(z,"cachesize")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        i++;
        cacheSize = integerValue(argv[i]);
      }else if( strcmp(z,"exclusive")==0 ){
        doExclusive = 1;
      }else if( strcmp(z,"checkpoint")==0 ){
        g.doCheckpoint = 1;
      }else if( strcmp(z,"explain")==0 ){
        g.bSqlOnly = 1;
        g.bExplain = 1;
      }else if( strcmp(z,"heap")==0 ){
        if( i>=argc-2 ) fatal_error("missing arguments on %s\n", argv[i]);
        nHeap = integerValue(argv[i+1]);
        mnHeap = integerValue(argv[i+2]);
        i += 2;
      }else if( strcmp(z,"incrvacuum")==0 ){
        doIncrvac = 1;
      }else if( strcmp(z,"journal")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        zJMode = argv[++i];
      }else if( strcmp(z,"key")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        zKey = argv[++i];
      }else if( strcmp(z,"lookaside")==0 ){
        if( i>=argc-2 ) fatal_error("missing arguments on %s\n", argv[i]);
        nLook = integerValue(argv[i+1]);
        szLook = integerValue(argv[i+2]);
        i += 2;
      }else if( strcmp(z,"memdb")==0 ){
        memDb = 1;
#if SQLITE_VERSION_NUMBER>=3006000
      }else if( strcmp(z,"multithread")==0 ){
        sqlite3_config(SQLITE_CONFIG_MULTITHREAD);
      }else if( strcmp(z,"nomemstat")==0 ){
        sqlite3_config(SQLITE_CONFIG_MEMSTATUS, 0);
#endif
#if SQLITE_VERSION_NUMBER>=3007017
      }else if( strcmp(z, "mmap")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        mmapSize = integerValue(argv[++i]);
 #endif
      }else if( strcmp(z,"nosync")==0 ){
        noSync = 1;
      }else if( strcmp(z,"notnull")==0 ){
        g.zNN = "NOT NULL";
      }else if( strcmp(z,"output")==0 ){
#ifdef SPEEDTEST_OMIT_HASH
        fatal_error("The --output option is not supported with"
                    " -DSPEEDTEST_OMIT_HASH\n");
#else
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        i++;
        if( strcmp(argv[i],"-")==0 ){
          g.hashFile = stdout;
        }else{
          g.hashFile = fopen(argv[i], "wb");
          if( g.hashFile==0 ){
            fatal_error("cannot open \"%s\" for writing\n", argv[i]);
          }
        }
#endif
      }else if( strcmp(z,"pagesize")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        pageSize = integerValue(argv[++i]);
      }else if( strcmp(z,"pcache")==0 ){
        if( i>=argc-2 ) fatal_error("missing arguments on %s\n", argv[i]);
        nPCache = integerValue(argv[i+1]);
        szPCache = integerValue(argv[i+2]);
        doPCache = 1;
        i += 2;
      }else if( strcmp(z,"primarykey")==0 ){
        g.zPK = "PRIMARY KEY";
      }else if( strcmp(z,"repeat")==0 ){
        if( i>=argc-1 ) fatal_error("missing arguments on %s\n", argv[i]);
        g.nRepeat = integerValue(argv[i+1]);
        i += 1;
      }else if( strcmp(z,"reprepare")==0 ){
        g.bReprepare = 1;
#if SQLITE_VERSION_NUMBER>=3006000
      }else if( strcmp(z,"serialized")==0 ){
        sqlite3_config(SQLITE_CONFIG_SERIALIZED);
      }else if( strcmp(z,"singlethread")==0 ){
        sqlite3_config(SQLITE_CONFIG_SINGLETHREAD);
#endif
      }else if( strcmp(z,"sqlonly")==0 ){
        g.bSqlOnly = 1;
      }else if( strcmp(z,"shrink-memory")==0 ){
        g.bMemShrink = 1;
      }else if( strcmp(z,"size")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        g.szTest = integerValue(argv[++i]);
      }else if( strcmp(z,"stats")==0 ){
        showStats = 1;
      }else if( strcmp(z,"temp")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        i++;
        if( argv[i][0]<'0' || argv[i][0]>'9' || argv[i][1]!=0 ){
          fatal_error("argument to --temp should be integer between 0 and 9");
        }
        g.eTemp = argv[i][0] - '0';
      }else if( strcmp(z,"testset")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        zTSet = argv[++i];
      }else if( strcmp(z,"trace")==0 ){
        doTrace = 1;
      }else if( strcmp(z,"threads")==0 ){
        if( i>=argc-1 ) fatal_error("missing argument on %s\n", argv[i]);
        nThread = integerValue(argv[++i]);
      }else if( strcmp(z,"utf16le")==0 ){
        zEncoding = "utf16le";
      }else if( strcmp(z,"utf16be")==0 ){
        zEncoding = "utf16be";
      }else if( strcmp(z,"verify")==0 ){
        g.bVerify = 1;
#ifndef SPEEDTEST_OMIT_HASH
        HashInit();
#endif
      }else if( strcmp(z,"without-rowid")==0 ){
        g.zWR = "WITHOUT ROWID";
        g.zPK = "PRIMARY KEY";
      }else if( strcmp(z, "help")==0 || strcmp(z,"?")==0 ){
        printf(zHelp, argv[0]);
        exit(0);
      }else{
        fatal_error("unknown option: %s\nUse \"%s -?\" for help\n",
                    argv[i], argv[0]);
      }
    }else if( zDbName==0 ){
      zDbName = argv[i];
    }else{
      fatal_error("surplus argument: %s\nUse \"%s -?\" for help\n",
                  argv[i], argv[0]);
    }
  }
  if( zDbName!=0 ) unlink(zDbName);
#if SQLITE_VERSION_NUMBER>=3006001
  if( nHeap>0 ){
    pHeap = malloc( nHeap );
    if( pHeap==0 ) fatal_error("cannot allocate %d-byte heap\n", nHeap);
    rc = sqlite3_config(SQLITE_CONFIG_HEAP, pHeap, nHeap, mnHeap);
    if( rc ) fatal_error("heap configuration failed: %d\n", rc);
  }
  if( doPCache ){
    if( nPCache>0 && szPCache>0 ){
      pPCache = malloc( nPCache*(sqlite3_int64)szPCache );
      if( pPCache==0 ) fatal_error("cannot allocate %lld-byte pcache\n",
                                   nPCache*(sqlite3_int64)szPCache);
    }
    rc = sqlite3_config(SQLITE_CONFIG_PAGECACHE, pPCache, szPCache, nPCache);
    if( rc ) fatal_error("pcache configuration failed: %d\n", rc);
  }
  if( nLook>=0 ){
    sqlite3_config(SQLITE_CONFIG_LOOKASIDE, 0, 0);
  }
#endif
  sqlite3_initialize();

  /* Open the database and the input file */
  if( sqlite3_open(memDb ? ":memory:" : zDbName, &g.db) ){
    fatal_error("Cannot open database file: %s\n", zDbName);
  }
#if SQLITE_VERSION_NUMBER>=3006001
  if( nLook>0 && szLook>0 ){
    pLook = malloc( nLook*szLook );
    rc = sqlite3_db_config(g.db, SQLITE_DBCONFIG_LOOKASIDE,pLook,szLook,nLook);
    if( rc ) fatal_error("lookaside configuration failed: %d\n", rc);
  }
#endif

  /* Set database connection options */
  sqlite3_create_function(g.db, "random", 0, SQLITE_UTF8, 0, randomFunc, 0, 0);
#ifndef SQLITE_OMIT_DEPRECATED
  if( doTrace ) sqlite3_trace(g.db, traceCallback, 0);
#endif
  if( memDb>0 ){
    speedtest1_exec("PRAGMA temp_store=memory");
  }
  if( mmapSize>0 ){
    speedtest1_exec("PRAGMA mmap_size=%d", mmapSize);
  }
  speedtest1_exec("PRAGMA threads=%d", nThread);
  if( zKey ){
    speedtest1_exec("PRAGMA key('%s')", zKey);
  }
  if( zEncoding ){
    speedtest1_exec("PRAGMA encoding=%s", zEncoding);
  }
  if( doAutovac ){
    speedtest1_exec("PRAGMA auto_vacuum=FULL");
  }else if( doIncrvac ){
    speedtest1_exec("PRAGMA auto_vacuum=INCREMENTAL");
  }
  if( pageSize ){
    speedtest1_exec("PRAGMA page_size=%d", pageSize);
  }
  if( cacheSize ){
    speedtest1_exec("PRAGMA cache_size=%d", cacheSize);
  }
  if( noSync ) speedtest1_exec("PRAGMA synchronous=OFF");
  if( doExclusive ){
    speedtest1_exec("PRAGMA locking_mode=EXCLUSIVE");
  }
  if( zJMode ){
    speedtest1_exec("PRAGMA journal_mode=%s", zJMode);
  }

  if( g.bExplain ) printf(".explain\n.echo on\n");
  do{
    char *zThisTest = zTSet;
    char *zComma = strchr(zThisTest,',');
    if( zComma ){
      *zComma = 0;
      zTSet = zComma+1;
    }else{
      zTSet = "";
    }
    if( g.iTotal>0 || zComma!=0 ){
      printf("       Begin testset \"%s\"\n", zThisTest);
    }
    if( strcmp(zThisTest,"main")==0 ){
      testset_main();
    }else if( strcmp(zThisTest,"debug1")==0 ){
      testset_debug1();
    }else if( strcmp(zThisTest,"orm")==0 ){
      testset_orm();
    }else if( strcmp(zThisTest,"cte")==0 ){
      testset_cte();
    }else if( strcmp(zThisTest,"fp")==0 ){
      testset_fp();
    }else if( strcmp(zThisTest,"trigger")==0 ){
      testset_trigger();
    }else if( strcmp(zThisTest,"rtree")==0 ){
#ifdef SQLITE_ENABLE_RTREE
      testset_rtree(6, 147);
#else
      fatal_error("compile with -DSQLITE_ENABLE_RTREE to enable "
                  "the R-Tree tests\n");
#endif
    }else{
      fatal_error("unknown testset: \"%s\"\n"
                  "Choices: cte debug1 fp main orm rtree trigger\n",
                   zThisTest);
    }
    if( zTSet[0] ){
      char *zSql, *zObj;
      speedtest1_begin_test(999, "Reset the database");
      while( 1 ){
        zObj = speedtest1_once(
             "SELECT name FROM main.sqlite_master"
             " WHERE sql LIKE 'CREATE %%TABLE%%'");
        if( zObj==0 ) break;
        zSql = sqlite3_mprintf("DROP TABLE main.\"%w\"", zObj);
        speedtest1_exec(zSql);
        sqlite3_free(zSql);
        sqlite3_free(zObj);
      }
      while( 1 ){
        zObj = speedtest1_once(
             "SELECT name FROM temp.sqlite_master"
             " WHERE sql LIKE 'CREATE %%TABLE%%'");
        if( zObj==0 ) break;
        zSql = sqlite3_mprintf("DROP TABLE main.\"%w\"", zObj);
        speedtest1_exec(zSql);
        sqlite3_free(zSql);
        sqlite3_free(zObj);
      }
      speedtest1_end_test();
    }
  }while( zTSet[0] );
  speedtest1_final();

  if( showStats ){
    sqlite3_exec(g.db, "PRAGMA compile_options", xCompileOptions, 0, 0);
  }

  /* Database connection statistics printed after both prepared statements
  ** have been finalized */
#if SQLITE_VERSION_NUMBER>=3007009
  if( showStats ){
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_LOOKASIDE_USED, &iCur, &iHi, 0);
    printf("-- Lookaside Slots Used:        %d (max %d)\n", iCur,iHi);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_LOOKASIDE_HIT, &iCur, &iHi, 0);
    printf("-- Successful lookasides:       %d\n", iHi);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_LOOKASIDE_MISS_SIZE, &iCur,&iHi,0);
    printf("-- Lookaside size faults:       %d\n", iHi);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_LOOKASIDE_MISS_FULL, &iCur,&iHi,0);
    printf("-- Lookaside OOM faults:        %d\n", iHi);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_CACHE_USED, &iCur, &iHi, 0);
    printf("-- Pager Heap Usage:            %d bytes\n", iCur);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_CACHE_HIT, &iCur, &iHi, 1);
    printf("-- Page cache hits:             %d\n", iCur);
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_CACHE_MISS, &iCur, &iHi, 1);
    printf("-- Page cache misses:           %d\n", iCur);
#if SQLITE_VERSION_NUMBER>=3007012
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_CACHE_WRITE, &iCur, &iHi, 1);
    printf("-- Page cache writes:           %d\n", iCur); 
#endif
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_SCHEMA_USED, &iCur, &iHi, 0);
    printf("-- Schema Heap Usage:           %d bytes\n", iCur); 
    sqlite3_db_status(g.db, SQLITE_DBSTATUS_STMT_USED, &iCur, &iHi, 0);
    printf("-- Statement Heap Usage:        %d bytes\n", iCur); 
  }
#endif

  sqlite3_close(g.db);

#if SQLITE_VERSION_NUMBER>=3006001
  /* Global memory usage statistics printed after the database connection
  ** has closed.  Memory usage should be zero at this point. */
  if( showStats ){
    sqlite3_status(SQLITE_STATUS_MEMORY_USED, &iCur, &iHi, 0);
    printf("-- Memory Used (bytes):         %d (max %d)\n", iCur,iHi);
#if SQLITE_VERSION_NUMBER>=3007000
    sqlite3_status(SQLITE_STATUS_MALLOC_COUNT, &iCur, &iHi, 0);
    printf("-- Outstanding Allocations:     %d (max %d)\n", iCur,iHi);
#endif
    sqlite3_status(SQLITE_STATUS_PAGECACHE_OVERFLOW, &iCur, &iHi, 0);
    printf("-- Pcache Overflow Bytes:       %d (max %d)\n", iCur,iHi);
    sqlite3_status(SQLITE_STATUS_MALLOC_SIZE, &iCur, &iHi, 0);
    printf("-- Largest Allocation:          %d bytes\n",iHi);
    sqlite3_status(SQLITE_STATUS_PAGECACHE_SIZE, &iCur, &iHi, 0);
    printf("-- Largest Pcache Allocation:   %d bytes\n",iHi);
  }
#endif

#ifdef __linux__
  if( showStats ){
    displayLinuxIoStats(stdout);
  }
#endif

  /* Release memory */
  free( pLook );
  free( pPCache );
  free( pHeap );
  return 0;
}
