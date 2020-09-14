/*
** 2010-07-22
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
** The code in this file runs a few multi-threaded test cases using the
** SQLite library. It can be compiled to an executable on unix using the
** following command:
**
**   gcc -O2 threadtest3.c sqlite3.c -ldl -lpthread -lm
**
** Even though threadtest3.c is the only C source code file mentioned on
** the compiler command-line, #include macros are used to pull in additional
** C code files named "tt3_*.c".
**
** After compiling, run this program with an optional argument telling
** which test to run.  All tests are run if no argument is given.  The
** argument can be a glob pattern to match multiple tests.  Examples:
**
**        ./a.out                 -- Run all tests
**        ./a.out walthread3      -- Run the "walthread3" test
**        ./a.out 'wal*'          -- Run all of the wal* tests
**        ./a.out --help          -- List all available tests
**
** The exit status is non-zero if any test fails.
*/

/* 
** The "Set Error Line" macro.
*/
#define SEL(e) ((e)->iLine = ((e)->rc ? (e)->iLine : __LINE__))

/* Database functions */
#define opendb(w,x,y,z)         (SEL(w), opendb_x(w,x,y,z))
#define closedb(y,z)            (SEL(y), closedb_x(y,z))

/* Functions to execute SQL */
#define sql_script(x,y,z)       (SEL(x), sql_script_x(x,y,z))
#define integrity_check(x,y)    (SEL(x), integrity_check_x(x,y))
#define execsql_i64(x,y,...)    (SEL(x), execsql_i64_x(x,y,__VA_ARGS__))
#define execsql_text(x,y,z,...) (SEL(x), execsql_text_x(x,y,z,__VA_ARGS__))
#define execsql(x,y,...)        (SEL(x), (void)execsql_i64_x(x,y,__VA_ARGS__))
#define sql_script_printf(x,y,z,...) (                \
    SEL(x), sql_script_printf_x(x,y,z,__VA_ARGS__)    \
) 

/* Thread functions */
#define launch_thread(w,x,y,z)     (SEL(w), launch_thread_x(w,x,y,z))
#define join_all_threads(y,z)      (SEL(y), join_all_threads_x(y,z))

/* Timer functions */
#define setstoptime(y,z)        (SEL(y), setstoptime_x(y,z))
#define timetostop(z)           (SEL(z), timetostop_x(z))

/* Report/clear errors. */
#define test_error(z, ...)      test_error_x(z, sqlite3_mprintf(__VA_ARGS__))
#define clear_error(y,z)        clear_error_x(y, z)

/* File-system operations */
#define filesize(y,z)           (SEL(y), filesize_x(y,z))
#define filecopy(x,y,z)         (SEL(x), filecopy_x(x,y,z))

#define PTR2INT(x) ((int)((intptr_t)x))
#define INT2PTR(x) ((void*)((intptr_t)x))

/*
** End of test code/infrastructure interface macros.
*************************************************************************/




#include <sqlite3.h>
#include <unistd.h>
#include <stdio.h>
#include <pthread.h>
#include <assert.h>
#include <sys/types.h> 
#include <sys/stat.h> 
#include <string.h>
#include <fcntl.h>
#include <errno.h>

#include "test_multiplex.h"

/* Required to link test_multiplex.c */
#ifndef SQLITE_OMIT_WSD
int sqlite3PendingByte = 0x40000000;
#endif

/*
 * This code implements the MD5 message-digest algorithm.
 * The algorithm is due to Ron Rivest.  This code was
 * written by Colin Plumb in 1993, no copyright is claimed.
 * This code is in the public domain; do with it what you wish.
 *
 * Equivalent code is available from RSA Data Security, Inc.
 * This code has been tested against that, and is equivalent,
 * except that you don't need to include two pages of legalese
 * with every copy.
 *
 * To compute the message digest of a chunk of bytes, declare an
 * MD5Context structure, pass it to MD5Init, call MD5Update as
 * needed on buffers full of bytes, and then call MD5Final, which
 * will fill a supplied 16-byte array with the digest.
 */

/*
 * If compiled on a machine that doesn't have a 32-bit integer,
 * you just set "uint32" to the appropriate datatype for an
 * unsigned 32-bit integer.  For example:
 *
 *       cc -Duint32='unsigned long' md5.c
 *
 */
#ifndef uint32
#  define uint32 unsigned int
#endif

struct MD5Context {
  int isInit;
  uint32 buf[4];
  uint32 bits[2];
  union {
    unsigned char in[64];
    uint32 in32[16];
  } u;
};
typedef struct MD5Context MD5Context;

/*
 * Note: this code is harmless on little-endian machines.
 */
static void byteReverse (unsigned char *buf, unsigned longs){
  uint32 t;
  do {
    t = (uint32)((unsigned)buf[3]<<8 | buf[2]) << 16 |
          ((unsigned)buf[1]<<8 | buf[0]);
    *(uint32 *)buf = t;
    buf += 4;
  } while (--longs);
}
/* The four core functions - F1 is optimized somewhat */

/* #define F1(x, y, z) (x & y | ~x & z) */
#define F1(x, y, z) (z ^ (x & (y ^ z)))
#define F2(x, y, z) F1(z, x, y)
#define F3(x, y, z) (x ^ y ^ z)
#define F4(x, y, z) (y ^ (x | ~z))

/* This is the central step in the MD5 algorithm. */
#define MD5STEP(f, w, x, y, z, data, s) \
  ( w += f(x, y, z) + data,  w = w<<s | w>>(32-s),  w += x )

/*
 * The core of the MD5 algorithm, this alters an existing MD5 hash to
 * reflect the addition of 16 longwords of new data.  MD5Update blocks
 * the data and converts bytes into longwords for this routine.
 */
static void MD5Transform(uint32 buf[4], const uint32 in[16]){
  register uint32 a, b, c, d;

  a = buf[0];
  b = buf[1];
  c = buf[2];
  d = buf[3];

  MD5STEP(F1, a, b, c, d, in[ 0]+0xd76aa478,  7);
  MD5STEP(F1, d, a, b, c, in[ 1]+0xe8c7b756, 12);
  MD5STEP(F1, c, d, a, b, in[ 2]+0x242070db, 17);
  MD5STEP(F1, b, c, d, a, in[ 3]+0xc1bdceee, 22);
  MD5STEP(F1, a, b, c, d, in[ 4]+0xf57c0faf,  7);
  MD5STEP(F1, d, a, b, c, in[ 5]+0x4787c62a, 12);
  MD5STEP(F1, c, d, a, b, in[ 6]+0xa8304613, 17);
  MD5STEP(F1, b, c, d, a, in[ 7]+0xfd469501, 22);
  MD5STEP(F1, a, b, c, d, in[ 8]+0x698098d8,  7);
  MD5STEP(F1, d, a, b, c, in[ 9]+0x8b44f7af, 12);
  MD5STEP(F1, c, d, a, b, in[10]+0xffff5bb1, 17);
  MD5STEP(F1, b, c, d, a, in[11]+0x895cd7be, 22);
  MD5STEP(F1, a, b, c, d, in[12]+0x6b901122,  7);
  MD5STEP(F1, d, a, b, c, in[13]+0xfd987193, 12);
  MD5STEP(F1, c, d, a, b, in[14]+0xa679438e, 17);
  MD5STEP(F1, b, c, d, a, in[15]+0x49b40821, 22);

  MD5STEP(F2, a, b, c, d, in[ 1]+0xf61e2562,  5);
  MD5STEP(F2, d, a, b, c, in[ 6]+0xc040b340,  9);
  MD5STEP(F2, c, d, a, b, in[11]+0x265e5a51, 14);
  MD5STEP(F2, b, c, d, a, in[ 0]+0xe9b6c7aa, 20);
  MD5STEP(F2, a, b, c, d, in[ 5]+0xd62f105d,  5);
  MD5STEP(F2, d, a, b, c, in[10]+0x02441453,  9);
  MD5STEP(F2, c, d, a, b, in[15]+0xd8a1e681, 14);
  MD5STEP(F2, b, c, d, a, in[ 4]+0xe7d3fbc8, 20);
  MD5STEP(F2, a, b, c, d, in[ 9]+0x21e1cde6,  5);
  MD5STEP(F2, d, a, b, c, in[14]+0xc33707d6,  9);
  MD5STEP(F2, c, d, a, b, in[ 3]+0xf4d50d87, 14);
  MD5STEP(F2, b, c, d, a, in[ 8]+0x455a14ed, 20);
  MD5STEP(F2, a, b, c, d, in[13]+0xa9e3e905,  5);
  MD5STEP(F2, d, a, b, c, in[ 2]+0xfcefa3f8,  9);
  MD5STEP(F2, c, d, a, b, in[ 7]+0x676f02d9, 14);
  MD5STEP(F2, b, c, d, a, in[12]+0x8d2a4c8a, 20);

  MD5STEP(F3, a, b, c, d, in[ 5]+0xfffa3942,  4);
  MD5STEP(F3, d, a, b, c, in[ 8]+0x8771f681, 11);
  MD5STEP(F3, c, d, a, b, in[11]+0x6d9d6122, 16);
  MD5STEP(F3, b, c, d, a, in[14]+0xfde5380c, 23);
  MD5STEP(F3, a, b, c, d, in[ 1]+0xa4beea44,  4);
  MD5STEP(F3, d, a, b, c, in[ 4]+0x4bdecfa9, 11);
  MD5STEP(F3, c, d, a, b, in[ 7]+0xf6bb4b60, 16);
  MD5STEP(F3, b, c, d, a, in[10]+0xbebfbc70, 23);
  MD5STEP(F3, a, b, c, d, in[13]+0x289b7ec6,  4);
  MD5STEP(F3, d, a, b, c, in[ 0]+0xeaa127fa, 11);
  MD5STEP(F3, c, d, a, b, in[ 3]+0xd4ef3085, 16);
  MD5STEP(F3, b, c, d, a, in[ 6]+0x04881d05, 23);
  MD5STEP(F3, a, b, c, d, in[ 9]+0xd9d4d039,  4);
  MD5STEP(F3, d, a, b, c, in[12]+0xe6db99e5, 11);
  MD5STEP(F3, c, d, a, b, in[15]+0x1fa27cf8, 16);
  MD5STEP(F3, b, c, d, a, in[ 2]+0xc4ac5665, 23);

  MD5STEP(F4, a, b, c, d, in[ 0]+0xf4292244,  6);
  MD5STEP(F4, d, a, b, c, in[ 7]+0x432aff97, 10);
  MD5STEP(F4, c, d, a, b, in[14]+0xab9423a7, 15);
  MD5STEP(F4, b, c, d, a, in[ 5]+0xfc93a039, 21);
  MD5STEP(F4, a, b, c, d, in[12]+0x655b59c3,  6);
  MD5STEP(F4, d, a, b, c, in[ 3]+0x8f0ccc92, 10);
  MD5STEP(F4, c, d, a, b, in[10]+0xffeff47d, 15);
  MD5STEP(F4, b, c, d, a, in[ 1]+0x85845dd1, 21);
  MD5STEP(F4, a, b, c, d, in[ 8]+0x6fa87e4f,  6);
  MD5STEP(F4, d, a, b, c, in[15]+0xfe2ce6e0, 10);
  MD5STEP(F4, c, d, a, b, in[ 6]+0xa3014314, 15);
  MD5STEP(F4, b, c, d, a, in[13]+0x4e0811a1, 21);
  MD5STEP(F4, a, b, c, d, in[ 4]+0xf7537e82,  6);
  MD5STEP(F4, d, a, b, c, in[11]+0xbd3af235, 10);
  MD5STEP(F4, c, d, a, b, in[ 2]+0x2ad7d2bb, 15);
  MD5STEP(F4, b, c, d, a, in[ 9]+0xeb86d391, 21);

  buf[0] += a;
  buf[1] += b;
  buf[2] += c;
  buf[3] += d;
}

/*
 * Start MD5 accumulation.  Set bit count to 0 and buffer to mysterious
 * initialization constants.
 */
static void MD5Init(MD5Context *ctx){
  ctx->isInit = 1;
  ctx->buf[0] = 0x67452301;
  ctx->buf[1] = 0xefcdab89;
  ctx->buf[2] = 0x98badcfe;
  ctx->buf[3] = 0x10325476;
  ctx->bits[0] = 0;
  ctx->bits[1] = 0;
}

/*
 * Update context to reflect the concatenation of another buffer full
 * of bytes.
 */
static 
void MD5Update(MD5Context *ctx, const unsigned char *buf, unsigned int len){
  uint32 t;

  /* Update bitcount */

  t = ctx->bits[0];
  if ((ctx->bits[0] = t + ((uint32)len << 3)) < t)
    ctx->bits[1]++; /* Carry from low to high */
  ctx->bits[1] += len >> 29;

  t = (t >> 3) & 0x3f;    /* Bytes already in shsInfo->data */

  /* Handle any leading odd-sized chunks */

  if ( t ) {
    unsigned char *p = (unsigned char *)ctx->u.in + t;

    t = 64-t;
    if (len < t) {
      memcpy(p, buf, len);
      return;
    }
    memcpy(p, buf, t);
    byteReverse(ctx->u.in, 16);
    MD5Transform(ctx->buf, (uint32 *)ctx->u.in);
    buf += t;
    len -= t;
  }

  /* Process data in 64-byte chunks */

  while (len >= 64) {
    memcpy(ctx->u.in, buf, 64);
    byteReverse(ctx->u.in, 16);
    MD5Transform(ctx->buf, (uint32 *)ctx->u.in);
    buf += 64;
    len -= 64;
  }

  /* Handle any remaining bytes of data. */

  memcpy(ctx->u.in, buf, len);
}

/*
 * Final wrapup - pad to 64-byte boundary with the bit pattern 
 * 1 0* (64-bit count of bits processed, MSB-first)
 */
static void MD5Final(unsigned char digest[16], MD5Context *ctx){
  unsigned count;
  unsigned char *p;

  /* Compute number of bytes mod 64 */
  count = (ctx->bits[0] >> 3) & 0x3F;

  /* Set the first char of padding to 0x80.  This is safe since there is
     always at least one byte free */
  p = ctx->u.in + count;
  *p++ = 0x80;

  /* Bytes of padding needed to make 64 bytes */
  count = 64 - 1 - count;

  /* Pad out to 56 mod 64 */
  if (count < 8) {
    /* Two lots of padding:  Pad the first block to 64 bytes */
    memset(p, 0, count);
    byteReverse(ctx->u.in, 16);
    MD5Transform(ctx->buf, (uint32 *)ctx->u.in);

    /* Now fill the next block with 56 bytes */
    memset(ctx->u.in, 0, 56);
  } else {
    /* Pad block to 56 bytes */
    memset(p, 0, count-8);
  }
  byteReverse(ctx->u.in, 14);

  /* Append length in bits and transform */
  ctx->u.in32[14] = ctx->bits[0];
  ctx->u.in32[15] = ctx->bits[1];

  MD5Transform(ctx->buf, (uint32 *)ctx->u.in);
  byteReverse((unsigned char *)ctx->buf, 4);
  memcpy(digest, ctx->buf, 16);
  memset(ctx, 0, sizeof(*ctx));    /* In case it is sensitive */
}

/*
** Convert a 128-bit MD5 digest into a 32-digit base-16 number.
*/
static void MD5DigestToBase16(unsigned char *digest, char *zBuf){
  static char const zEncode[] = "0123456789abcdef";
  int i, j;

  for(j=i=0; i<16; i++){
    int a = digest[i];
    zBuf[j++] = zEncode[(a>>4)&0xf];
    zBuf[j++] = zEncode[a & 0xf];
  }
  zBuf[j] = 0;
}

/*
** During testing, the special md5sum() aggregate function is available.
** inside SQLite.  The following routines implement that function.
*/
static void md5step(sqlite3_context *context, int argc, sqlite3_value **argv){
  MD5Context *p;
  int i;
  if( argc<1 ) return;
  p = sqlite3_aggregate_context(context, sizeof(*p));
  if( p==0 ) return;
  if( !p->isInit ){
    MD5Init(p);
  }
  for(i=0; i<argc; i++){
    const char *zData = (char*)sqlite3_value_text(argv[i]);
    if( zData ){
      MD5Update(p, (unsigned char*)zData, strlen(zData));
    }
  }
}
static void md5finalize(sqlite3_context *context){
  MD5Context *p;
  unsigned char digest[16];
  char zBuf[33];
  p = sqlite3_aggregate_context(context, sizeof(*p));
  MD5Final(digest,p);
  MD5DigestToBase16(digest, zBuf);
  sqlite3_result_text(context, zBuf, -1, SQLITE_TRANSIENT);
}

/*
** End of copied md5sum() code.
**************************************************************************/

typedef sqlite3_int64 i64;

typedef struct Error Error;
typedef struct Sqlite Sqlite;
typedef struct Statement Statement;

typedef struct Threadset Threadset;
typedef struct Thread Thread;

/* Total number of errors in this process so far. */
static int nGlobalErr = 0;

struct Error {
  int rc;
  int iLine;
  char *zErr;
};

struct Sqlite {
  sqlite3 *db;                    /* Database handle */
  Statement *pCache;              /* Linked list of cached statements */
  int nText;                      /* Size of array at aText[] */
  char **aText;                   /* Stored text results */
};

struct Statement {
  sqlite3_stmt *pStmt;            /* Pre-compiled statement handle */
  Statement *pNext;               /* Next statement in linked-list */
};

struct Thread {
  int iTid;                       /* Thread number within test */
  void* pArg;                     /* Pointer argument passed by caller */

  pthread_t tid;                  /* Thread id */
  char *(*xProc)(int, void*);     /* Thread main proc */
  Thread *pNext;                  /* Next in this list of threads */
};

struct Threadset {
  int iMaxTid;                    /* Largest iTid value allocated so far */
  Thread *pThread;                /* Linked list of threads */
};

static void free_err(Error *p){
  sqlite3_free(p->zErr);
  p->zErr = 0;
  p->rc = 0;
}

static void print_err(Error *p){
  if( p->rc!=SQLITE_OK ){
    int isWarn = 0;
    if( p->rc==SQLITE_SCHEMA ) isWarn = 1;
    if( sqlite3_strglob("* - no such table: *",p->zErr)==0 ) isWarn = 1;
    printf("%s: (%d) \"%s\" at line %d\n", isWarn ? "Warning" : "Error",
            p->rc, p->zErr, p->iLine);
    if( !isWarn ) nGlobalErr++;
    fflush(stdout);
  }
}

static void print_and_free_err(Error *p){
  print_err(p);
  free_err(p);
}

static void system_error(Error *pErr, int iSys){
  pErr->rc = iSys;
  pErr->zErr = (char *)sqlite3_malloc(512);
  strerror_r(iSys, pErr->zErr, 512);
  pErr->zErr[511] = '\0';
}

static void sqlite_error(
  Error *pErr, 
  Sqlite *pDb, 
  const char *zFunc
){
  pErr->rc = sqlite3_errcode(pDb->db);
  pErr->zErr = sqlite3_mprintf(
      "sqlite3_%s() - %s (%d)", zFunc, sqlite3_errmsg(pDb->db),
      sqlite3_extended_errcode(pDb->db)
  );
}

static void test_error_x(
  Error *pErr,
  char *zErr
){
  if( pErr->rc==SQLITE_OK ){
    pErr->rc = 1;
    pErr->zErr = zErr;
  }else{
    sqlite3_free(zErr);
  }
}

static void clear_error_x(
  Error *pErr,
  int rc
){
  if( pErr->rc==rc ){
    pErr->rc = SQLITE_OK;
    sqlite3_free(pErr->zErr);
    pErr->zErr = 0;
  }
}

static int busyhandler(void *pArg, int n){
  usleep(10*1000);
  return 1;
}

static void opendb_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* OUT: Database handle */
  const char *zFile,              /* Database file name */
  int bDelete                     /* True to delete db file before opening */
){
  if( pErr->rc==SQLITE_OK ){
    int rc;
    int flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_URI;
    if( bDelete ) unlink(zFile);
    rc = sqlite3_open_v2(zFile, &pDb->db, flags, 0);
    if( rc ){
      sqlite_error(pErr, pDb, "open");
      sqlite3_close(pDb->db);
      pDb->db = 0;
    }else{
      sqlite3_create_function(
          pDb->db, "md5sum", -1, SQLITE_UTF8, 0, 0, md5step, md5finalize
      );
      sqlite3_busy_handler(pDb->db, busyhandler, 0);
      sqlite3_exec(pDb->db, "PRAGMA synchronous=OFF", 0, 0, 0);
    }
  }
}

static void closedb_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb                     /* OUT: Database handle */
){
  int rc;
  int i;
  Statement *pIter;
  Statement *pNext;
  for(pIter=pDb->pCache; pIter; pIter=pNext){
    pNext = pIter->pNext;
    sqlite3_finalize(pIter->pStmt);
    sqlite3_free(pIter);
  }
  for(i=0; i<pDb->nText; i++){
    sqlite3_free(pDb->aText[i]);
  }
  sqlite3_free(pDb->aText);
  rc = sqlite3_close(pDb->db);
  if( rc && pErr->rc==SQLITE_OK ){
    pErr->zErr = sqlite3_mprintf("%s", sqlite3_errmsg(pDb->db));
  }
  memset(pDb, 0, sizeof(Sqlite));
}

static void sql_script_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  const char *zSql                /* SQL script to execute */
){
  if( pErr->rc==SQLITE_OK ){
    pErr->rc = sqlite3_exec(pDb->db, zSql, 0, 0, &pErr->zErr);
  }
}

static void sql_script_printf_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  const char *zFormat,            /* SQL printf format string */
  ...                             /* Printf args */
){
  va_list ap;                     /* ... printf arguments */
  va_start(ap, zFormat);
  if( pErr->rc==SQLITE_OK ){
    char *zSql = sqlite3_vmprintf(zFormat, ap);
    pErr->rc = sqlite3_exec(pDb->db, zSql, 0, 0, &pErr->zErr);
    sqlite3_free(zSql);
  }
  va_end(ap);
}

static Statement *getSqlStatement(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  const char *zSql                /* SQL statement */
){
  Statement *pRet;
  int rc;

  for(pRet=pDb->pCache; pRet; pRet=pRet->pNext){
    if( 0==strcmp(sqlite3_sql(pRet->pStmt), zSql) ){
      return pRet;
    }
  }

  pRet = sqlite3_malloc(sizeof(Statement));
  rc = sqlite3_prepare_v2(pDb->db, zSql, -1, &pRet->pStmt, 0);
  if( rc!=SQLITE_OK ){
    sqlite_error(pErr, pDb, "prepare_v2");
    return 0;
  }
  assert( 0==strcmp(sqlite3_sql(pRet->pStmt), zSql) );

  pRet->pNext = pDb->pCache;
  pDb->pCache = pRet;
  return pRet;
}

static sqlite3_stmt *getAndBindSqlStatement(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  va_list ap                      /* SQL followed by parameters */
){
  Statement *pStatement;          /* The SQLite statement wrapper */
  sqlite3_stmt *pStmt;            /* The SQLite statement to return */
  int i;                          /* Used to iterate through parameters */

  pStatement = getSqlStatement(pErr, pDb, va_arg(ap, const char *));
  if( !pStatement ) return 0;
  pStmt = pStatement->pStmt;
  for(i=1; i<=sqlite3_bind_parameter_count(pStmt); i++){
    const char *zName = sqlite3_bind_parameter_name(pStmt, i);
    void * pArg = va_arg(ap, void*);

    switch( zName[1] ){
      case 'i':
        sqlite3_bind_int64(pStmt, i, *(i64 *)pArg);
        break;

      default:
        pErr->rc = 1;
        pErr->zErr = sqlite3_mprintf("Cannot discern type: \"%s\"", zName);
        pStmt = 0;
        break;
    }
  }

  return pStmt;
}

static i64 execsql_i64_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  ...                             /* SQL and pointers to parameter values */
){
  i64 iRet = 0;
  if( pErr->rc==SQLITE_OK ){
    sqlite3_stmt *pStmt;          /* SQL statement to execute */
    va_list ap;                   /* ... arguments */
    va_start(ap, pDb);
    pStmt = getAndBindSqlStatement(pErr, pDb, ap);
    if( pStmt ){
      int first = 1;
      while( SQLITE_ROW==sqlite3_step(pStmt) ){
        if( first && sqlite3_column_count(pStmt)>0 ){
          iRet = sqlite3_column_int64(pStmt, 0);
        }
        first = 0;
      }
      if( SQLITE_OK!=sqlite3_reset(pStmt) ){
        sqlite_error(pErr, pDb, "reset");
      }
    }
    va_end(ap);
  }
  return iRet;
}

static char * execsql_text_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb,                    /* Database handle */
  int iSlot,                      /* Db handle slot to store text in */
  ...                             /* SQL and pointers to parameter values */
){
  char *zRet = 0;

  if( iSlot>=pDb->nText ){
    int nByte = sizeof(char *)*(iSlot+1);
    pDb->aText = (char **)sqlite3_realloc(pDb->aText, nByte);
    memset(&pDb->aText[pDb->nText], 0, sizeof(char*)*(iSlot+1-pDb->nText));
    pDb->nText = iSlot+1;
  }

  if( pErr->rc==SQLITE_OK ){
    sqlite3_stmt *pStmt;          /* SQL statement to execute */
    va_list ap;                   /* ... arguments */
    va_start(ap, iSlot);
    pStmt = getAndBindSqlStatement(pErr, pDb, ap);
    if( pStmt ){
      int first = 1;
      while( SQLITE_ROW==sqlite3_step(pStmt) ){
        if( first && sqlite3_column_count(pStmt)>0 ){
          zRet = sqlite3_mprintf("%s", sqlite3_column_text(pStmt, 0));
          sqlite3_free(pDb->aText[iSlot]);
          pDb->aText[iSlot] = zRet;
        }
        first = 0;
      }
      if( SQLITE_OK!=sqlite3_reset(pStmt) ){
        sqlite_error(pErr, pDb, "reset");
      }
    }
    va_end(ap);
  }

  return zRet;
}

static void integrity_check_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Sqlite *pDb                     /* Database handle */
){
  if( pErr->rc==SQLITE_OK ){
    Statement *pStatement;        /* Statement to execute */
    char *zErr = 0;               /* Integrity check error */

    pStatement = getSqlStatement(pErr, pDb, "PRAGMA integrity_check");
    if( pStatement ){
      sqlite3_stmt *pStmt = pStatement->pStmt;
      while( SQLITE_ROW==sqlite3_step(pStmt) ){
        const char *z = (const char*)sqlite3_column_text(pStmt, 0);
        if( strcmp(z, "ok") ){
          if( zErr==0 ){
            zErr = sqlite3_mprintf("%s", z);
          }else{
            zErr = sqlite3_mprintf("%z\n%s", zErr, z);
          }
        }
      }
      sqlite3_reset(pStmt);

      if( zErr ){
        pErr->zErr = zErr;
        pErr->rc = 1;
      }
    }
  }
}

static void *launch_thread_main(void *pArg){
  Thread *p = (Thread *)pArg;
  return (void *)p->xProc(p->iTid, p->pArg);
}

static void launch_thread_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Threadset *pThreads,            /* Thread set */
  char *(*xProc)(int, void*),     /* Proc to run */
  void *pArg                      /* Argument passed to thread proc */
){
  if( pErr->rc==SQLITE_OK ){
    int iTid = ++pThreads->iMaxTid;
    Thread *p;
    int rc;

    p = (Thread *)sqlite3_malloc(sizeof(Thread));
    memset(p, 0, sizeof(Thread));
    p->iTid = iTid;
    p->pArg = pArg;
    p->xProc = xProc;

    rc = pthread_create(&p->tid, NULL, launch_thread_main, (void *)p);
    if( rc!=0 ){
      system_error(pErr, rc);
      sqlite3_free(p);
    }else{
      p->pNext = pThreads->pThread;
      pThreads->pThread = p;
    }
  }
}

static void join_all_threads_x(
  Error *pErr,                    /* IN/OUT: Error code */
  Threadset *pThreads             /* Thread set */
){
  Thread *p;
  Thread *pNext;
  for(p=pThreads->pThread; p; p=pNext){
    void *ret;
    pNext = p->pNext;
    int rc;
    rc = pthread_join(p->tid, &ret);
    if( rc!=0 ){
      if( pErr->rc==SQLITE_OK ) system_error(pErr, rc);
    }else{
      printf("Thread %d says: %s\n", p->iTid, (ret==0 ? "..." : (char *)ret));
      fflush(stdout);
    }
    sqlite3_free(p);
  }
  pThreads->pThread = 0;
}

static i64 filesize_x(
  Error *pErr,
  const char *zFile
){
  i64 iRet = 0;
  if( pErr->rc==SQLITE_OK ){
    struct stat sStat;
    if( stat(zFile, &sStat) ){
      iRet = -1;
    }else{
      iRet = sStat.st_size;
    }
  }
  return iRet;
}

static void filecopy_x(
  Error *pErr,
  const char *zFrom,
  const char *zTo
){
  if( pErr->rc==SQLITE_OK ){
    i64 nByte = filesize_x(pErr, zFrom);
    if( nByte<0 ){
      test_error_x(pErr, sqlite3_mprintf("no such file: %s", zFrom));
    }else{
      i64 iOff;
      char aBuf[1024];
      int fd1;
      int fd2;
      unlink(zTo);

      fd1 = open(zFrom, O_RDONLY);
      if( fd1<0 ){
        system_error(pErr, errno);
        return;
      }
      fd2 = open(zTo, O_RDWR|O_CREAT|O_EXCL, 0644);
      if( fd2<0 ){
        system_error(pErr, errno);
        close(fd1);
        return;
      }

      iOff = 0;
      while( iOff<nByte ){
        int nCopy = sizeof(aBuf);
        if( nCopy+iOff>nByte ){
          nCopy = nByte - iOff;
        }
        if( nCopy!=read(fd1, aBuf, nCopy) ){
          system_error(pErr, errno);
          break;
        }
        if( nCopy!=write(fd2, aBuf, nCopy) ){
          system_error(pErr, errno);
          break;
        }
        iOff += nCopy;
      }

      close(fd1);
      close(fd2);
    }
  }
}

/* 
** Used by setstoptime() and timetostop().
*/
static double timelimit = 0.0;

static double currentTime(void){
  double t;
  static sqlite3_vfs *pTimelimitVfs = 0;
  if( pTimelimitVfs==0 ) pTimelimitVfs = sqlite3_vfs_find(0);
  if( pTimelimitVfs->iVersion>=2 && pTimelimitVfs->xCurrentTimeInt64!=0 ){
    sqlite3_int64 tm;
    pTimelimitVfs->xCurrentTimeInt64(pTimelimitVfs, &tm);
    t = tm/86400000.0;
  }else{
    pTimelimitVfs->xCurrentTime(pTimelimitVfs, &t);
  }
  return t;
}

static void setstoptime_x(
  Error *pErr,                    /* IN/OUT: Error code */
  int nMs                         /* Milliseconds until "stop time" */
){
  if( pErr->rc==SQLITE_OK ){
    double t = currentTime();
    timelimit = t + ((double)nMs)/(1000.0*60.0*60.0*24.0);
  }
}

static int timetostop_x(
  Error *pErr                     /* IN/OUT: Error code */
){
  int ret = 1;
  if( pErr->rc==SQLITE_OK ){
    double t = currentTime();
    ret = (t >= timelimit);
  }
  return ret;
}


/*************************************************************************
**************************************************************************
**************************************************************************
** End infrastructure. Begin tests.
*/

#define WALTHREAD1_NTHREAD  10
#define WALTHREAD3_NTHREAD  6

static char *walthread1_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int nIter = 0;                  /* Iterations so far */

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    const char *azSql[] = {
      "SELECT md5sum(x) FROM t1 WHERE rowid != (SELECT max(rowid) FROM t1)",
      "SELECT x FROM t1 WHERE rowid = (SELECT max(rowid) FROM t1)",
    };
    char *z1, *z2, *z3;

    execsql(&err, &db, "BEGIN");
    integrity_check(&err, &db);
    z1 = execsql_text(&err, &db, 1, azSql[0]);
    z2 = execsql_text(&err, &db, 2, azSql[1]);
    z3 = execsql_text(&err, &db, 3, azSql[0]);
    execsql(&err, &db, "COMMIT");

    if( strcmp(z1, z2) || strcmp(z1, z3) ){
      test_error(&err, "Failed read: %s %s %s", z1, z2, z3);
    }

    sql_script(&err, &db,
        "BEGIN;"
          "INSERT INTO t1 VALUES(randomblob(100));"
          "INSERT INTO t1 VALUES(randomblob(100));"
          "INSERT INTO t1 SELECT md5sum(x) FROM t1;"
        "COMMIT;"
    );
    nIter++;
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return sqlite3_mprintf("%d iterations", nIter);
}

static char *walthread1_ckpt_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int nCkpt = 0;                  /* Checkpoints so far */

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    usleep(500*1000);
    execsql(&err, &db, "PRAGMA wal_checkpoint");
    if( err.rc==SQLITE_OK ) nCkpt++;
    clear_error(&err, SQLITE_BUSY);
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return sqlite3_mprintf("%d checkpoints", nCkpt);
}

static void walthread1(int nMs){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  Threadset threads = {0};        /* Test threads */
  int i;                          /* Iterator variable */

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db,
      "PRAGMA journal_mode = WAL;"
      "CREATE TABLE t1(x PRIMARY KEY);"
      "INSERT INTO t1 VALUES(randomblob(100));"
      "INSERT INTO t1 VALUES(randomblob(100));"
      "INSERT INTO t1 SELECT md5sum(x) FROM t1;"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);
  for(i=0; i<WALTHREAD1_NTHREAD; i++){
    launch_thread(&err, &threads, walthread1_thread, 0);
  }
  launch_thread(&err, &threads, walthread1_ckpt_thread, 0);
  join_all_threads(&err, &threads);

  print_and_free_err(&err);
}

static char *walthread2_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int anTrans[2] = {0, 0};        /* Number of WAL and Rollback transactions */
  int iArg = PTR2INT(pArg);

  const char *zJournal = "PRAGMA journal_mode = WAL";
  if( iArg ){ zJournal = "PRAGMA journal_mode = DELETE"; }

  while( !timetostop(&err) ){
    int journal_exists = 0;
    int wal_exists = 0;

    opendb(&err, &db, "test.db", 0);

    sql_script(&err, &db, zJournal);
    clear_error(&err, SQLITE_BUSY);
    sql_script(&err, &db, "BEGIN");
    sql_script(&err, &db, "INSERT INTO t1 VALUES(NULL, randomblob(100))");

    journal_exists = (filesize(&err, "test.db-journal") >= 0);
    wal_exists = (filesize(&err, "test.db-wal") >= 0);
    if( (journal_exists+wal_exists)!=1 ){
      test_error(&err, "File system looks incorrect (%d, %d)", 
          journal_exists, wal_exists
      );
    }
    anTrans[journal_exists]++;

    sql_script(&err, &db, "COMMIT");
    integrity_check(&err, &db);
    closedb(&err, &db);
  }

  print_and_free_err(&err);
  return sqlite3_mprintf("W %d R %d", anTrans[0], anTrans[1]);
}

static void walthread2(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, "CREATE TABLE t1(x INTEGER PRIMARY KEY, y UNIQUE)");
  closedb(&err, &db);

  setstoptime(&err, nMs);
  launch_thread(&err, &threads, walthread2_thread, 0);
  launch_thread(&err, &threads, walthread2_thread, 0);
  launch_thread(&err, &threads, walthread2_thread, (void*)1);
  launch_thread(&err, &threads, walthread2_thread, (void*)1);
  join_all_threads(&err, &threads);

  print_and_free_err(&err);
}

static char *walthread3_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  i64 iNextWrite;                 /* Next value this thread will write */
  int iArg = PTR2INT(pArg);

  opendb(&err, &db, "test.db", 0);
  sql_script(&err, &db, "PRAGMA wal_autocheckpoint = 10");

  iNextWrite = iArg+1;
  while( 1 ){
    i64 sum1;
    i64 sum2;
    int stop = 0;                 /* True to stop executing (test timed out) */

    while( 0==(stop = timetostop(&err)) ){
      i64 iMax = execsql_i64(&err, &db, "SELECT max(cnt) FROM t1");
      if( iMax+1==iNextWrite ) break;
    }
    if( stop ) break;

    sum1 = execsql_i64(&err, &db, "SELECT sum(cnt) FROM t1");
    sum2 = execsql_i64(&err, &db, "SELECT sum(sum1) FROM t1");
    execsql_i64(&err, &db, 
        "INSERT INTO t1 VALUES(:iNextWrite, :iSum1, :iSum2)",
        &iNextWrite, &sum1, &sum2
    );
    integrity_check(&err, &db);

    iNextWrite += WALTHREAD3_NTHREAD;
  }

  closedb(&err, &db);
  print_and_free_err(&err);
  return 0;
}

static void walthread3(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};
  int i;

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
      "PRAGMA journal_mode = WAL;"
      "CREATE TABLE t1(cnt PRIMARY KEY, sum1, sum2);"
      "CREATE INDEX i1 ON t1(sum1);"
      "CREATE INDEX i2 ON t1(sum2);"
      "INSERT INTO t1 VALUES(0, 0, 0);"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);
  for(i=0; i<WALTHREAD3_NTHREAD; i++){
    launch_thread(&err, &threads, walthread3_thread, INT2PTR(i));
  }
  join_all_threads(&err, &threads);

  print_and_free_err(&err);
}

static char *walthread4_reader_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    integrity_check(&err, &db);
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return 0;
}

static char *walthread4_writer_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  i64 iRow = 1;

  opendb(&err, &db, "test.db", 0);
  sql_script(&err, &db, "PRAGMA wal_autocheckpoint = 15;");
  while( !timetostop(&err) ){
    execsql_i64(
        &err, &db, "REPLACE INTO t1 VALUES(:iRow, randomblob(300))", &iRow
    );
    iRow++;
    if( iRow==10 ) iRow = 0;
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return 0;
}

static void walthread4(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
      "PRAGMA journal_mode = WAL;"
      "CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE);"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);
  launch_thread(&err, &threads, walthread4_reader_thread, 0);
  launch_thread(&err, &threads, walthread4_writer_thread, 0);
  join_all_threads(&err, &threads);

  print_and_free_err(&err);
}

static char *walthread5_thread(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  i64 nRow;

  opendb(&err, &db, "test.db", 0);
  nRow = execsql_i64(&err, &db, "SELECT count(*) FROM t1");
  closedb(&err, &db);

  if( nRow!=65536 ) test_error(&err, "Bad row count: %d", (int)nRow);
  print_and_free_err(&err);
  return 0;
}
static void walthread5(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
      "PRAGMA wal_autocheckpoint = 0;"
      "PRAGMA page_size = 1024;"
      "PRAGMA journal_mode = WAL;"
      "CREATE TABLE t1(x);"
      "BEGIN;"
      "INSERT INTO t1 VALUES(randomblob(900));"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*     2 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*     4 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*     8 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*    16 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*    32 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*    64 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*   128 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*   256 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*   512 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*  1024 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*  2048 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*  4096 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /*  8192 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /* 16384 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /* 32768 */"
      "INSERT INTO t1 SELECT randomblob(900) FROM t1;      /* 65536 */"
      "COMMIT;"
  );
  filecopy(&err, "test.db", "test_sv.db");
  filecopy(&err, "test.db-wal", "test_sv.db-wal");
  closedb(&err, &db);

  filecopy(&err, "test_sv.db", "test.db");
  filecopy(&err, "test_sv.db-wal", "test.db-wal");

  if( err.rc==SQLITE_OK ){
    printf("  WAL file is %d bytes,", (int)filesize(&err,"test.db-wal"));
    printf(" DB file is %d.\n", (int)filesize(&err,"test.db"));
  }

  setstoptime(&err, nMs);
  launch_thread(&err, &threads, walthread5_thread, 0);
  launch_thread(&err, &threads, walthread5_thread, 0);
  launch_thread(&err, &threads, walthread5_thread, 0);
  launch_thread(&err, &threads, walthread5_thread, 0);
  launch_thread(&err, &threads, walthread5_thread, 0);
  join_all_threads(&err, &threads);

  if( err.rc==SQLITE_OK ){
    printf("  WAL file is %d bytes,", (int)filesize(&err,"test.db-wal"));
    printf(" DB file is %d.\n", (int)filesize(&err,"test.db"));
  }

  print_and_free_err(&err);
}

/*------------------------------------------------------------------------
** Test case "cgt_pager_1"
*/
#define CALLGRINDTEST1_NROW 10000
static void cgt_pager_1_populate(Error *pErr, Sqlite *pDb){
  const char *zInsert = "INSERT INTO t1 VALUES(:iRow, zeroblob(:iBlob))";
  i64 iRow;
  sql_script(pErr, pDb, "BEGIN");
  for(iRow=1; iRow<=CALLGRINDTEST1_NROW; iRow++){
    i64 iBlob = 600 + (iRow%300);
    execsql(pErr, pDb, zInsert, &iRow, &iBlob);
  }
  sql_script(pErr, pDb, "COMMIT");
}
static void cgt_pager_1_update(Error *pErr, Sqlite *pDb){
  const char *zUpdate = "UPDATE t1 SET b = zeroblob(:iBlob) WHERE a = :iRow";
  i64 iRow;
  sql_script(pErr, pDb, "BEGIN");
  for(iRow=1; iRow<=CALLGRINDTEST1_NROW; iRow++){
    i64 iBlob = 600 + ((iRow+100)%300);
    execsql(pErr, pDb, zUpdate, &iBlob, &iRow);
  }
  sql_script(pErr, pDb, "COMMIT");
}
static void cgt_pager_1_read(Error *pErr, Sqlite *pDb){
  i64 iRow;
  sql_script(pErr, pDb, "BEGIN");
  for(iRow=1; iRow<=CALLGRINDTEST1_NROW; iRow++){
    execsql(pErr, pDb, "SELECT * FROM t1 WHERE a = :iRow", &iRow);
  }
  sql_script(pErr, pDb, "COMMIT");
}
static void cgt_pager_1(int nMs){
  void (*xSub)(Error *, Sqlite *);
  Error err = {0};
  Sqlite db = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db,
      "PRAGMA cache_size = 2000;"
      "PRAGMA page_size = 1024;"
      "CREATE TABLE t1(a INTEGER PRIMARY KEY, b BLOB);"
  );

  xSub = cgt_pager_1_populate; xSub(&err, &db);
  xSub = cgt_pager_1_update;   xSub(&err, &db);
  xSub = cgt_pager_1_read;     xSub(&err, &db);

  closedb(&err, &db);
  print_and_free_err(&err);
}

/*------------------------------------------------------------------------
** Test case "dynamic_triggers"
**
**   Two threads executing statements that cause deeply nested triggers
**   to fire. And one thread busily creating and deleting triggers. This
**   is an attempt to find a bug reported to us.
*/

static char *dynamic_triggers_1(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  int nDrop = 0;
  int nCreate = 0;

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    int i;

    for(i=1; i<9; i++){
      char *zSql = sqlite3_mprintf(
        "CREATE TRIGGER itr%d BEFORE INSERT ON t%d BEGIN "
          "INSERT INTO t%d VALUES(new.x, new.y);"
        "END;", i, i, i+1
      );
      execsql(&err, &db, zSql);
      sqlite3_free(zSql);
      nCreate++;
    }

    for(i=1; i<9; i++){
      char *zSql = sqlite3_mprintf(
        "CREATE TRIGGER dtr%d BEFORE DELETE ON t%d BEGIN "
          "DELETE FROM t%d WHERE x = old.x; "
        "END;", i, i, i+1
      );
      execsql(&err, &db, zSql);
      sqlite3_free(zSql);
      nCreate++;
    }

    for(i=1; i<9; i++){
      char *zSql = sqlite3_mprintf("DROP TRIGGER itr%d", i);
      execsql(&err, &db, zSql);
      sqlite3_free(zSql);
      nDrop++;
    }

    for(i=1; i<9; i++){
      char *zSql = sqlite3_mprintf("DROP TRIGGER dtr%d", i);
      execsql(&err, &db, zSql);
      sqlite3_free(zSql);
      nDrop++;
    }
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return sqlite3_mprintf("%d created, %d dropped", nCreate, nDrop);
}

static char *dynamic_triggers_2(int iTid, void *pArg){
  Error err = {0};                /* Error code and message */
  Sqlite db = {0};                /* SQLite database connection */
  i64 iVal = 0;
  int nInsert = 0;
  int nDelete = 0;

  opendb(&err, &db, "test.db", 0);
  while( !timetostop(&err) ){
    do {
      iVal = (iVal+1)%100;
      execsql(&err, &db, "INSERT INTO t1 VALUES(:iX, :iY+1)", &iVal, &iVal);
      nInsert++;
    } while( iVal );

    do {
      iVal = (iVal+1)%100;
      execsql(&err, &db, "DELETE FROM t1 WHERE x = :iX", &iVal);
      nDelete++;
    } while( iVal );
  }
  closedb(&err, &db);

  print_and_free_err(&err);
  return sqlite3_mprintf("%d inserts, %d deletes", nInsert, nDelete);
}

static void dynamic_triggers(int nMs){
  Error err = {0};
  Sqlite db = {0};
  Threadset threads = {0};

  opendb(&err, &db, "test.db", 1);
  sql_script(&err, &db, 
      "PRAGMA page_size = 1024;"
      "PRAGMA journal_mode = WAL;"
      "CREATE TABLE t1(x, y);"
      "CREATE TABLE t2(x, y);"
      "CREATE TABLE t3(x, y);"
      "CREATE TABLE t4(x, y);"
      "CREATE TABLE t5(x, y);"
      "CREATE TABLE t6(x, y);"
      "CREATE TABLE t7(x, y);"
      "CREATE TABLE t8(x, y);"
      "CREATE TABLE t9(x, y);"
  );
  closedb(&err, &db);

  setstoptime(&err, nMs);

  sqlite3_enable_shared_cache(1);
  launch_thread(&err, &threads, dynamic_triggers_2, 0);
  launch_thread(&err, &threads, dynamic_triggers_2, 0);

  sleep(2);
  sqlite3_enable_shared_cache(0);

  launch_thread(&err, &threads, dynamic_triggers_2, 0);
  launch_thread(&err, &threads, dynamic_triggers_1, 0);

  join_all_threads(&err, &threads);

  print_and_free_err(&err);
}



#include "tt3_checkpoint.c"
#include "tt3_index.c"
#include "tt3_lookaside1.c"
#include "tt3_vacuum.c"
#include "tt3_stress.c"

int main(int argc, char **argv){
  struct ThreadTest {
    void (*xTest)(int);   /* Routine for running this test */
    const char *zTest;    /* Name of this test */
    int nMs;              /* How long to run this test, in milliseconds */
  } aTest[] = {
    { walthread1, "walthread1", 20000 },
    { walthread2, "walthread2", 20000 },
    { walthread3, "walthread3", 20000 },
    { walthread4, "walthread4", 20000 },
    { walthread5, "walthread5",  1000 },
    
    { cgt_pager_1,      "cgt_pager_1", 0 },
    { dynamic_triggers, "dynamic_triggers", 20000 },

    { checkpoint_starvation_1, "checkpoint_starvation_1", 10000 },
    { checkpoint_starvation_2, "checkpoint_starvation_2", 10000 },

    { create_drop_index_1, "create_drop_index_1", 10000 },
    { lookaside1,          "lookaside1", 10000 },
    { vacuum1,             "vacuum1", 10000 },
    { stress1,             "stress1", 10000 },
    { stress2,             "stress2", 60000 },
  };
  static char *substArgv[] = { 0, "*", 0 };
  int i, iArg;
  int nTestfound = 0;

  sqlite3_config(SQLITE_CONFIG_MULTITHREAD);
  if( argc<2 ){
    argc = 2;
    argv = substArgv;
  }

  /* Loop through the command-line arguments to ensure that each argument
  ** selects at least one test. If not, assume there is a typo on the 
  ** command-line and bail out with the usage message.  */
  for(iArg=1; iArg<argc; iArg++){
    const char *zArg = argv[iArg];
    if( zArg[0]=='-' ){
      if( sqlite3_stricmp(zArg, "-multiplexor")==0 ){
        /* Install the multiplexor VFS as the default */
        int rc = sqlite3_multiplex_initialize(0, 1);
        if( rc!=SQLITE_OK ){
          fprintf(stderr, "Failed to install multiplexor VFS (%d)\n", rc);
          return 253;
        }
      }
      else {
        goto usage;
      }

      continue;
    }

    for(i=0; i<sizeof(aTest)/sizeof(aTest[0]); i++){
      if( sqlite3_strglob(zArg, aTest[i].zTest)==0 ) break;
    }
    if( i>=sizeof(aTest)/sizeof(aTest[0]) ) goto usage;   
  }

  for(iArg=1; iArg<argc; iArg++){
    if( argv[iArg][0]=='-' ) continue;
    for(i=0; i<sizeof(aTest)/sizeof(aTest[0]); i++){
      char const *z = aTest[i].zTest;
      if( sqlite3_strglob(argv[iArg],z)==0 ){
        printf("Running %s for %d seconds...\n", z, aTest[i].nMs/1000);
        fflush(stdout);
        aTest[i].xTest(aTest[i].nMs);
        nTestfound++;
      }
    }
  }
  if( nTestfound==0 ) goto usage;

  printf("%d errors out of %d tests\n", nGlobalErr, nTestfound);
  return (nGlobalErr>0 ? 255 : 0);

 usage:
  printf("Usage: %s [-multiplexor] [testname|testprefix*]...\n", argv[0]);
  printf("Available tests are:\n");
  for(i=0; i<sizeof(aTest)/sizeof(aTest[0]); i++){
    printf("   %s\n", aTest[i].zTest);
  }

  return 254;
}
