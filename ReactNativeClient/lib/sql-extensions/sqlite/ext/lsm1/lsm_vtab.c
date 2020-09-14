/*
** 2015-11-16
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
** This file implements a virtual table for SQLite3 around the LSM
** storage engine from SQLite4.
**
** USAGE
**
**   CREATE VIRTUAL TABLE demo USING lsm1(filename,key,keytype,value1,...);
**
** The filename parameter is the name of the LSM database file, which is
** separate and distinct from the SQLite3 database file.
**
** The keytype must be one of: UINT, TEXT, BLOB.  All keys must be of that
** one type.  "UINT" means unsigned integer.  The values may be of any
** SQLite datatype: BLOB, TEXT, INTEGER, FLOAT, or NULL.
**
** The virtual table contains read-only hidden columns:
**
**     lsm1_key	      A BLOB which is the raw LSM key.  If the "keytype"
**                    is BLOB or TEXT then this column is exactly the
**                    same as the key.  For the UINT keytype, this column
**                    will be a variable-length integer encoding of the key.
**
**     lsm1_value     A BLOB which is the raw LSM value.  All of the value
**                    columns are packed into this BLOB using the encoding
**                    described below.
**
** Attempts to write values into the lsm1_key and lsm1_value columns are
** silently ignored.
**
** EXAMPLE
**
** The virtual table declared this way:
**
**    CREATE VIRTUAL TABLE demo2 USING lsm1('x.lsm',id,UINT,a,b,c,d);
**
** Results in a new virtual table named "demo2" that acts as if it has
** the following schema:
**
**    CREATE TABLE demo2(
**      id UINT PRIMARY KEY ON CONFLICT REPLACE,
**      a ANY,
**      b ANY,
**      c ANY,
**      d ANY,
**      lsm1_key BLOB HIDDEN,
**      lsm1_value BLOB HIDDEN
**    ) WITHOUT ROWID;
**
** 
**
** INTERNALS
**
** The key encoding for BLOB and TEXT is just a copy of the blob or text.
** UTF-8 is used for text.  The key encoding for UINT is the variable-length
** integer format at https://sqlite.org/src4/doc/trunk/www/varint.wiki.
**
** The values are encoded as a single blob (since that is what lsm stores as
** its content).  There is a "type integer" followed by "content" for each
** value, alternating back and forth.  The content might be empty.
**
**    TYPE1  CONTENT1  TYPE2  CONTENT2  TYPE3  CONTENT3 ....
**
** Each "type integer" is encoded as a variable-length integer in the
** format of the link above.  Let the type integer be T.  The actual
** datatype is an integer 0-5 equal to T%6.  Values 1 through 5 correspond
** to SQLITE_INTEGER through SQLITE_NULL.  The size of the content in bytes
** is T/6.  Type value 0 means that the value is an integer whose actual
** values is T/6 and there is no content.  The type-value-0 integer format
** only works for integers in the range of 0 through 40.
**
** There is no content for NULL or type-0 integers.  For BLOB and TEXT
** values, the content is the blob data or the UTF-8 text data.  For
** non-negative integers X, the content is a variable-length integer X*2.
** For negative integers Y, the content is varaible-length integer (1-Y)*2+1.
** For FLOAT values, the content is the IEEE754 floating point value in
** native byte-order.  This means that FLOAT values will be corrupted when
** database file is moved between big-endian and little-endian machines.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include "lsm.h"
#include <assert.h>
#include <string.h>

/* Forward declaration of subclasses of virtual table objects */
typedef struct lsm1_vtab lsm1_vtab;
typedef struct lsm1_cursor lsm1_cursor;
typedef struct lsm1_vblob lsm1_vblob;

/* Primitive types */
typedef unsigned char u8;
typedef unsigned int u32;
typedef sqlite3_uint64 u64;

/* An open connection to an LSM table */
struct lsm1_vtab {
  sqlite3_vtab base;          /* Base class - must be first */
  lsm_db *pDb;                /* Open connection to the LSM table */
  u8 keyType;                 /* SQLITE_BLOB, _TEXT, or _INTEGER */
  u32 nVal;                   /* Number of value columns */
};


/* lsm1_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
struct lsm1_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  lsm_cursor *pLsmCur;       /* The LSM cursor */
  u8 isDesc;                 /* 0: scan forward.  1: scan reverse */
  u8 atEof;                  /* True if the scan is complete */
  u8 bUnique;                /* True if no more than one row of output */
  u8 *zData;                 /* Content of the current row */
  u32 nData;                 /* Number of bytes in the current row */
  u8 *aeType;                /* Types for all column values */
  u32 *aiOfst;               /* Offsets to the various fields */
  u32 *aiLen;                /* Length of each field */
  u8 *pKey2;                 /* Loop termination key, or NULL */
  u32 nKey2;                 /* Length of the loop termination key */
};

/* An extensible buffer object.
**
** Content can be appended.  Space to hold new content is automatically
** allocated.
*/
struct lsm1_vblob {
  u8 *a;             /* Space to hold content, from sqlite3_malloc64() */
  u64 n;             /* Bytes of space used */
  u64 nAlloc;        /* Bytes of space allocated */
  u8 errNoMem;       /* True if a memory allocation error has been seen */
};

#if defined(__GNUC__)
#  define LSM1_NOINLINE  __attribute__((noinline))
#elif defined(_MSC_VER) && _MSC_VER>=1310
#  define LSM1_NOINLINE  __declspec(noinline)
#else
#  define LSM1_NOINLINE
#endif


/* Increase the available space in the vblob object so that it can hold
** at least N more bytes.  Return the number of errors.
*/
static int lsm1VblobEnlarge(lsm1_vblob *p, u32 N){
  if( p->n+N>p->nAlloc ){
    if( p->errNoMem ) return 1;
    p->nAlloc += N + (p->nAlloc ? p->nAlloc : N);
    p->a = sqlite3_realloc64(p->a, p->nAlloc);
    if( p->a==0 ){
      p->n = 0;
      p->nAlloc = 0;
      p->errNoMem = 1;
      return 1;
    }
    p->nAlloc = sqlite3_msize(p->a);
  }
  return 0;
}

/* Append N bytes to a vblob after first enlarging it */
static LSM1_NOINLINE void lsm1VblobEnlargeAndAppend(
  lsm1_vblob *p,
  const u8 *pData,
  u32 N
){
  if( p->n+N>p->nAlloc && lsm1VblobEnlarge(p, N) ) return;
  memcpy(p->a+p->n, pData, N);
  p->n += N;
}

/* Append N bytes to a vblob */
static void lsm1VblobAppend(lsm1_vblob *p, const u8 *pData, u32 N){
  sqlite3_int64 n = p->n;
  if( n+N>p->nAlloc ){
    lsm1VblobEnlargeAndAppend(p, pData, N);
  }else{
    p->n += N;
    memcpy(p->a+n, pData, N);
  }
}

/* append text to a vblob */
static void lsm1VblobAppendText(lsm1_vblob *p, const char *z){
  lsm1VblobAppend(p, (u8*)z, (u32)strlen(z));
}

/* Dequote the string */
static void lsm1Dequote(char *z){
  int j;
  char cQuote = z[0];
  size_t i, n;

  if( cQuote!='\'' && cQuote!='"' ) return;
  n = strlen(z);
  if( n<2 || z[n-1]!=z[0] ) return;
  for(i=1, j=0; i<n-1; i++){
    if( z[i]==cQuote && z[i+1]==cQuote ) i++;
    z[j++] = z[i];
  }
  z[j] = 0;
}


/*
** The lsm1Connect() method is invoked to create a new
** lsm1_vtab that describes the virtual table.
*/
static int lsm1Connect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  lsm1_vtab *pNew;
  int rc;
  char *zFilename;
  u8 keyType = 0;
  int i;
  lsm1_vblob sql;
  static const char *azTypes[] = { "UINT",         "TEXT",     "BLOB" };
  static const u8 aeTypes[] =    { SQLITE_INTEGER, SQLITE_TEXT, SQLITE_BLOB };
  static const char *azArgName[] = {"filename", "key", "key type", "value1" };

  for(i=0; i<sizeof(azArgName)/sizeof(azArgName[0]); i++){
    if( argc<i+4 || argv[i+3]==0 || argv[i+3][0]==0 ){
      *pzErr = sqlite3_mprintf("%s (%r) argument missing",
                               azArgName[i], i+1);
      return SQLITE_ERROR;
    }
  }
  for(i=0; i<sizeof(azTypes)/sizeof(azTypes[0]); i++){
    if( sqlite3_stricmp(azTypes[i],argv[5])==0 ){
      keyType = aeTypes[i];
      break;
    }
  }
  if( keyType==0 ){
    *pzErr = sqlite3_mprintf("key type should be INT, TEXT, or BLOB");
    return SQLITE_ERROR;
  }
  *ppVtab = sqlite3_malloc( sizeof(*pNew) );
  pNew = (lsm1_vtab*)*ppVtab;
  if( pNew==0 ){
    return SQLITE_NOMEM;
  }
  memset(pNew, 0, sizeof(*pNew));
  pNew->keyType = keyType;
  rc = lsm_new(0, &pNew->pDb);
  if( rc ){
    *pzErr = sqlite3_mprintf("lsm_new failed with error code %d",  rc);
    rc = SQLITE_ERROR;
    goto connect_failed;
  }
  zFilename = sqlite3_mprintf("%s", argv[3]);
  lsm1Dequote(zFilename);
  rc = lsm_open(pNew->pDb, zFilename);
  sqlite3_free(zFilename);
  if( rc ){
    *pzErr = sqlite3_mprintf("lsm_open failed with %d", rc);
    rc = SQLITE_ERROR;
    goto connect_failed;
  }

  memset(&sql, 0, sizeof(sql));
  lsm1VblobAppendText(&sql, "CREATE TABLE x(");
  lsm1VblobAppendText(&sql, argv[4]);
  lsm1VblobAppendText(&sql, " ");
  lsm1VblobAppendText(&sql, argv[5]);
  lsm1VblobAppendText(&sql, " PRIMARY KEY");
  for(i=6; i<argc; i++){
    lsm1VblobAppendText(&sql, ", ");
    lsm1VblobAppendText(&sql, argv[i]);
    pNew->nVal++;
  }
  lsm1VblobAppendText(&sql, 
      ", lsm1_command HIDDEN"
      ", lsm1_key HIDDEN"
      ", lsm1_value HIDDEN) WITHOUT ROWID");
  lsm1VblobAppend(&sql, (u8*)"", 1);
  if( sql.errNoMem ){
    rc = SQLITE_NOMEM;
    goto connect_failed;
  }
  rc = sqlite3_declare_vtab(db, (const char*)sql.a);
  sqlite3_free(sql.a);

connect_failed:
  if( rc!=SQLITE_OK ){
    if( pNew ){
      if( pNew->pDb ) lsm_close(pNew->pDb);
      sqlite3_free(pNew);
    }
    *ppVtab = 0;
  }
  return rc;
}

/*
** This method is the destructor for lsm1_cursor objects.
*/
static int lsm1Disconnect(sqlite3_vtab *pVtab){
  lsm1_vtab *p = (lsm1_vtab*)pVtab;
  lsm_close(p->pDb);
  sqlite3_free(p);
  return SQLITE_OK;
}

/*
** Constructor for a new lsm1_cursor object.
*/
static int lsm1Open(sqlite3_vtab *pVtab, sqlite3_vtab_cursor **ppCursor){
  lsm1_vtab *p = (lsm1_vtab*)pVtab;
  lsm1_cursor *pCur;
  int rc;
  pCur = sqlite3_malloc64( sizeof(*pCur)
                 + p->nVal*(sizeof(pCur->aiOfst)+sizeof(pCur->aiLen)+1) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->aiOfst = (u32*)&pCur[1];
  pCur->aiLen = &pCur->aiOfst[p->nVal];
  pCur->aeType = (u8*)&pCur->aiLen[p->nVal];
  *ppCursor = &pCur->base;
  rc = lsm_csr_open(p->pDb, &pCur->pLsmCur);
  if( rc==LSM_OK ){
    rc = SQLITE_OK;
  }else{
    sqlite3_free(pCur);
    *ppCursor = 0;
    rc = SQLITE_ERROR;
  }
  return rc;
}

/*
** Destructor for a lsm1_cursor.
*/
static int lsm1Close(sqlite3_vtab_cursor *cur){
  lsm1_cursor *pCur = (lsm1_cursor*)cur;
  sqlite3_free(pCur->pKey2);
  lsm_csr_close(pCur->pLsmCur);
  sqlite3_free(pCur);
  return SQLITE_OK;
}


/*
** Advance a lsm1_cursor to its next row of output.
*/
static int lsm1Next(sqlite3_vtab_cursor *cur){
  lsm1_cursor *pCur = (lsm1_cursor*)cur;
  int rc = LSM_OK;
  if( pCur->bUnique ){
    pCur->atEof = 1;
  }else{
    if( pCur->isDesc ){
      rc = lsm_csr_prev(pCur->pLsmCur);
    }else{
      rc = lsm_csr_next(pCur->pLsmCur);
    }
    if( rc==LSM_OK && lsm_csr_valid(pCur->pLsmCur)==0 ){
      pCur->atEof = 1;
    }
    if( pCur->pKey2 && pCur->atEof==0 ){
      const u8 *pVal;
      u32 nVal;
      assert( pCur->isDesc==0 );
      rc = lsm_csr_key(pCur->pLsmCur, (const void**)&pVal, (int*)&nVal);
      if( rc==LSM_OK ){
        u32 len = pCur->nKey2;
        int c;
        if( len>nVal ) len = nVal;
        c = memcmp(pVal, pCur->pKey2, len);
        if( c==0 ) c = nVal - pCur->nKey2;
        if( c>0 ) pCur->atEof = 1;
      }
    }
    pCur->zData = 0;
  }
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int lsm1Eof(sqlite3_vtab_cursor *cur){
  lsm1_cursor *pCur = (lsm1_cursor*)cur;
  return pCur->atEof;
}

/*
** Rowids are not supported by the underlying virtual table.  So always
** return 0 for the rowid.
*/
static int lsm1Rowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  *pRowid = 0;
  return SQLITE_OK;
}

/*
** Type prefixes on LSM keys
*/
#define LSM1_TYPE_NEGATIVE   0
#define LSM1_TYPE_POSITIVE   1
#define LSM1_TYPE_TEXT       2
#define LSM1_TYPE_BLOB       3

/*
** Write a 32-bit unsigned integer as 4 big-endian bytes.
*/
static void varintWrite32(unsigned char *z, unsigned int y){
  z[0] = (unsigned char)(y>>24);
  z[1] = (unsigned char)(y>>16);
  z[2] = (unsigned char)(y>>8);
  z[3] = (unsigned char)(y);
}

/*
** Write a varint into z[].  The buffer z[] must be at least 9 characters
** long to accommodate the largest possible varint.  Return the number of
** bytes of z[] used.
*/
static int lsm1PutVarint64(unsigned char *z, sqlite3_uint64 x){
  unsigned int w, y;
  if( x<=240 ){
    z[0] = (unsigned char)x;
    return 1;
  }
  if( x<=2287 ){
    y = (unsigned int)(x - 240);
    z[0] = (unsigned char)(y/256 + 241);
    z[1] = (unsigned char)(y%256);
    return 2;
  }
  if( x<=67823 ){
    y = (unsigned int)(x - 2288);
    z[0] = 249;
    z[1] = (unsigned char)(y/256);
    z[2] = (unsigned char)(y%256);
    return 3;
  }
  y = (unsigned int)x;
  w = (unsigned int)(x>>32);
  if( w==0 ){
    if( y<=16777215 ){
      z[0] = 250;
      z[1] = (unsigned char)(y>>16);
      z[2] = (unsigned char)(y>>8);
      z[3] = (unsigned char)(y);
      return 4;
    }
    z[0] = 251;
    varintWrite32(z+1, y);
    return 5;
  }
  if( w<=255 ){
    z[0] = 252;
    z[1] = (unsigned char)w;
    varintWrite32(z+2, y);
    return 6;
  }
  if( w<=65535 ){
    z[0] = 253;
    z[1] = (unsigned char)(w>>8);
    z[2] = (unsigned char)w;
    varintWrite32(z+3, y);
    return 7;
  }
  if( w<=16777215 ){
    z[0] = 254;
    z[1] = (unsigned char)(w>>16);
    z[2] = (unsigned char)(w>>8);
    z[3] = (unsigned char)w;
    varintWrite32(z+4, y);
    return 8;
  }
  z[0] = 255;
  varintWrite32(z+1, w);
  varintWrite32(z+5, y);
  return 9;
}

/* Append non-negative integer x as a variable-length integer.
*/
static void lsm1VblobAppendVarint(lsm1_vblob *p, sqlite3_uint64 x){
  sqlite3_int64 n = p->n;
  if( n+9>p->nAlloc && lsm1VblobEnlarge(p, 9) ) return;
  p->n += lsm1PutVarint64(p->a+p->n, x);
}

/*
** Decode the varint in the first n bytes z[].  Write the integer value
** into *pResult and return the number of bytes in the varint.
**
** If the decode fails because there are not enough bytes in z[] then
** return 0;
*/
static int lsm1GetVarint64(
  const unsigned char *z,
  int n,
  sqlite3_uint64 *pResult
){
  unsigned int x;
  if( n<1 ) return 0;
  if( z[0]<=240 ){
    *pResult = z[0];
    return 1;
  }
  if( z[0]<=248 ){
    if( n<2 ) return 0;
    *pResult = (z[0]-241)*256 + z[1] + 240;
    return 2;
  }
  if( n<z[0]-246 ) return 0;
  if( z[0]==249 ){
    *pResult = 2288 + 256*z[1] + z[2];
    return 3;
  }
  if( z[0]==250 ){
    *pResult = (z[1]<<16) + (z[2]<<8) + z[3];
    return 4;
  }
  x = (z[1]<<24) + (z[2]<<16) + (z[3]<<8) + z[4];
  if( z[0]==251 ){
    *pResult = x;
    return 5;
  }
  if( z[0]==252 ){
    *pResult = (((sqlite3_uint64)x)<<8) + z[5];
    return 6;
  }
  if( z[0]==253 ){
    *pResult = (((sqlite3_uint64)x)<<16) + (z[5]<<8) + z[6];
    return 7;
  }
  if( z[0]==254 ){
    *pResult = (((sqlite3_uint64)x)<<24) + (z[5]<<16) + (z[6]<<8) + z[7];
    return 8;
  }
  *pResult = (((sqlite3_uint64)x)<<32) +
               (0xffffffff & ((z[5]<<24) + (z[6]<<16) + (z[7]<<8) + z[8]));
  return 9;
}

/* Encoded a signed integer as a varint.  Numbers close to zero uses fewer
** bytes than numbers far away from zero.  However, the result is not in
** lexicographical order.
**
** Encoding:  Non-negative integer X is encoding as an unsigned
** varint X*2.  Negative integer Y is encoding as an unsigned
** varint (1-Y)*2 + 1.
*/
static int lsm1PutSignedVarint64(u8 *z, sqlite3_int64 v){
  sqlite3_uint64 u;
  if( v>=0 ){
    u = (sqlite3_uint64)v;
    return lsm1PutVarint64(z, u*2);
  }else{
    u = (sqlite3_uint64)(-1-v);
    return lsm1PutVarint64(z, u*2+1);
  }
}

/* Decoded a signed varint. */
static int lsm1GetSignedVarint64(
  const unsigned char *z,
  int n,
  sqlite3_int64 *pResult
){
  sqlite3_uint64 u = 0;
  n = lsm1GetVarint64(z, n, &u);
  if( u&1 ){
    *pResult = -1 - (sqlite3_int64)(u>>1);
  }else{
    *pResult = (sqlite3_int64)(u>>1);
  }
  return n;
}


/*
** Read the value part of the key-value pair and decode it into columns.
*/
static int lsm1DecodeValues(lsm1_cursor *pCur){
  lsm1_vtab *pTab = (lsm1_vtab*)(pCur->base.pVtab);
  int i, n;
  int rc;
  u8 eType;
  sqlite3_uint64 v;

  if( pCur->zData ) return 1;
  rc = lsm_csr_value(pCur->pLsmCur, (const void**)&pCur->zData,
                     (int*)&pCur->nData);
  if( rc ) return 0;
  for(i=n=0; i<pTab->nVal; i++){
    v = 0;
    n += lsm1GetVarint64(pCur->zData+n, pCur->nData-n, &v);
    pCur->aeType[i] = eType = (u8)(v%6);
    if( eType==0 ){
      pCur->aiOfst[i] = (u32)(v/6);
      pCur->aiLen[i] = 0;
    }else{ 
      pCur->aiOfst[i] = n;
      n += (pCur->aiLen[i] = (u32)(v/6));
    }
    if( n>pCur->nData ) break;
  }
  if( i<pTab->nVal ){
    pCur->zData = 0;
    return 0;
  }
  return 1;
}

/*
** Return values of columns for the row at which the lsm1_cursor
** is currently pointing.
*/
static int lsm1Column(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  lsm1_cursor *pCur = (lsm1_cursor*)cur;
  lsm1_vtab *pTab = (lsm1_vtab*)(cur->pVtab);
  if( i==0 ){
    /* The key column */
    const void *pVal;
    int nVal;
    if( lsm_csr_key(pCur->pLsmCur, &pVal, &nVal)==LSM_OK ){
      if( pTab->keyType==SQLITE_BLOB ){
        sqlite3_result_blob(ctx, pVal, nVal, SQLITE_TRANSIENT);
      }else if( pTab->keyType==SQLITE_TEXT ){
        sqlite3_result_text(ctx,(const char*)pVal, nVal, SQLITE_TRANSIENT);
      }else{
        const unsigned char *z = (const unsigned char*)pVal;
        sqlite3_uint64 v1;
        lsm1GetVarint64(z, nVal, &v1);
        sqlite3_result_int64(ctx, (sqlite3_int64)v1);
      }
    }
  }else if( i>pTab->nVal ){
    if( i==pTab->nVal+2 ){  /* lsm1_key */
      const void *pVal;
      int nVal;
      if( lsm_csr_key(pCur->pLsmCur, &pVal, &nVal)==LSM_OK ){
        sqlite3_result_blob(ctx, pVal, nVal, SQLITE_TRANSIENT);
      }
    }else if( i==pTab->nVal+3 ){  /* lsm1_value */
      const void *pVal;
      int nVal;
      if( lsm_csr_value(pCur->pLsmCur, &pVal, &nVal)==LSM_OK ){
        sqlite3_result_blob(ctx, pVal, nVal, SQLITE_TRANSIENT);
      }
    }
  }else if( lsm1DecodeValues(pCur) ){
    /* The i-th value column (where leftmost is 1) */
    const u8 *zData;
    u32 nData;
    i--;
    zData = pCur->zData + pCur->aiOfst[i];
    nData = pCur->aiLen[i];
    switch( pCur->aeType[i] ){
      case 0: {  /* in-line integer */
        sqlite3_result_int(ctx, pCur->aiOfst[i]);
        break;
      }
      case SQLITE_INTEGER: {
        sqlite3_int64 v;
        lsm1GetSignedVarint64(zData, nData, &v);
        sqlite3_result_int64(ctx, v);
        break;
      }
      case SQLITE_FLOAT: {
        double v;
        if( nData==sizeof(v) ){
          memcpy(&v, zData, sizeof(v));
          sqlite3_result_double(ctx, v);
        }
        break;
      }
      case SQLITE_TEXT: {
        sqlite3_result_text(ctx, (const char*)zData, nData, SQLITE_TRANSIENT);
        break;
      }
      case SQLITE_BLOB: {
        sqlite3_result_blob(ctx, zData, nData, SQLITE_TRANSIENT);
        break;
      }
      default: {
         /* A NULL.  Do nothing */
      }
    }
  }
  return SQLITE_OK;
}

/* Parameter "pValue" contains an SQL value that is to be used as
** a key in an LSM table.  The type of the key is determined by
** "keyType".  Extract the raw bytes used for the key in LSM1.
*/
static void lsm1KeyFromValue(
  int keyType,                 /* The key type */
  sqlite3_value *pValue,       /* The key value */
  u8 *pBuf,                    /* Storage space for a generated key */
  const u8 **ppKey,            /* OUT: the bytes of the key */
  int *pnKey                   /* OUT: size of the key */
){
  if( keyType==SQLITE_BLOB ){
    *ppKey = (const u8*)sqlite3_value_blob(pValue);
    *pnKey = sqlite3_value_bytes(pValue);
  }else if( keyType==SQLITE_TEXT ){
    *ppKey = (const u8*)sqlite3_value_text(pValue);
    *pnKey = sqlite3_value_bytes(pValue);
  }else{
    sqlite3_int64 v = sqlite3_value_int64(pValue);
    if( v<0 ) v = 0;
    *pnKey = lsm1PutVarint64(pBuf, v);
    *ppKey = pBuf;
  }
}

/* Move to the first row to return.
*/
static int lsm1Filter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  lsm1_cursor *pCur = (lsm1_cursor *)pVtabCursor;
  lsm1_vtab *pTab = (lsm1_vtab*)(pCur->base.pVtab);
  int rc = LSM_OK;
  int seekType = -1;
  const u8 *pVal = 0;
  int nVal;
  u8 keyType = pTab->keyType;
  u8 aKey1[16];

  pCur->atEof = 1;
  sqlite3_free(pCur->pKey2);
  pCur->pKey2 = 0;
  if( idxNum<99 ){
    lsm1KeyFromValue(keyType, argv[0], aKey1, &pVal, &nVal);
  }
  switch( idxNum ){
    case 0: {   /* key==argv[0] */
      assert( argc==1 );
      seekType = LSM_SEEK_EQ;
      pCur->isDesc = 0;
      pCur->bUnique = 1;
      break;
    }
    case 1: {  /* key>=argv[0] AND key<=argv[1] */
      u8 aKey[12];
      seekType = LSM_SEEK_GE;
      pCur->isDesc = 0;
      pCur->bUnique = 0;
      if( keyType==SQLITE_INTEGER ){
        sqlite3_int64 v = sqlite3_value_int64(argv[1]);
        if( v<0 ) v = 0;
        pCur->nKey2 = lsm1PutVarint64(aKey, (sqlite3_uint64)v);
        pCur->pKey2 = sqlite3_malloc( pCur->nKey2 );
        if( pCur->pKey2==0 ) return SQLITE_NOMEM;
        memcpy(pCur->pKey2, aKey, pCur->nKey2);
      }else{
        pCur->nKey2 = sqlite3_value_bytes(argv[1]);
        pCur->pKey2 = sqlite3_malloc( pCur->nKey2 );
        if( pCur->pKey2==0 ) return SQLITE_NOMEM;
        if( keyType==SQLITE_BLOB ){
          memcpy(pCur->pKey2, sqlite3_value_blob(argv[1]), pCur->nKey2);
        }else{
          memcpy(pCur->pKey2, sqlite3_value_text(argv[1]), pCur->nKey2);
        }
      }
      break;
    }
    case 2: {  /* key>=argv[0] */
      seekType = LSM_SEEK_GE;
      pCur->isDesc = 0;
      pCur->bUnique = 0;
      break;
    }
    case 3: {  /* key<=argv[0] */
      seekType = LSM_SEEK_LE;
      pCur->isDesc = 1;
      pCur->bUnique = 0;
      break;
    }
    default: { /* full table scan */
      pCur->isDesc = 0;
      pCur->bUnique = 0;
      break;
    }
  }
  if( pVal ){
    rc = lsm_csr_seek(pCur->pLsmCur, pVal, nVal, seekType);
  }else{
    rc = lsm_csr_first(pCur->pLsmCur);
  }
  if( rc==LSM_OK && lsm_csr_valid(pCur->pLsmCur)!=0 ){
    pCur->atEof = 0;
  }
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}

/*
** Only comparisons against the key are allowed.  The idxNum defines
** which comparisons are available:
**
**     0        key==?1
**     1        key>=?1 AND key<=?2
**     2        key>?1 or key>=?1
**     3        key<?1 or key<=?1
**    99        Full table scan only
*/
static int lsm1BestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;                 /* Loop over constraints */
  int idxNum = 99;       /* The query plan */
  int nArg = 0;          /* Number of arguments to xFilter */
  int argIdx = -1;       /* Index of the key== constraint, or -1 if none */
  int iIdx2 = -1;        /* The index of the second key */
  int omit1 = 0;
  int omit2 = 0;

  const struct sqlite3_index_constraint *pConstraint;
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->usable==0 ) continue;
    if( pConstraint->iColumn!=0 ) continue;
    switch( pConstraint->op ){
      case SQLITE_INDEX_CONSTRAINT_EQ: {
        if( idxNum>0 ){
          argIdx = i;
          iIdx2 = -1;
          idxNum = 0;
          omit1 = 1;
        }
        break;
      }
      case SQLITE_INDEX_CONSTRAINT_GE:
      case SQLITE_INDEX_CONSTRAINT_GT: {
        if( idxNum==99 ){
          argIdx = i;
          idxNum = 2;
          omit1 = pConstraint->op==SQLITE_INDEX_CONSTRAINT_GE;
        }else if( idxNum==3 ){
          iIdx2 = idxNum;
          omit2 = omit1;
          argIdx = i;
          idxNum = 1;
          omit1 = pConstraint->op==SQLITE_INDEX_CONSTRAINT_GE;
        }
        break;
      }
      case SQLITE_INDEX_CONSTRAINT_LE:
      case SQLITE_INDEX_CONSTRAINT_LT: {
        if( idxNum==99 ){
          argIdx = i;
          idxNum = 3;
          omit1 = pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE;
        }else if( idxNum==2 ){
          iIdx2 = i;
          idxNum = 1;
          omit1 = pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE;
        }
        break;
      }
    }
  }
  if( argIdx>=0 ){
    pIdxInfo->aConstraintUsage[argIdx].argvIndex = ++nArg;
    pIdxInfo->aConstraintUsage[argIdx].omit = omit1;
  }
  if( iIdx2>=0 ){
    pIdxInfo->aConstraintUsage[iIdx2].argvIndex = ++nArg;
    pIdxInfo->aConstraintUsage[iIdx2].omit = omit2;
  }
  if( idxNum==0 ){
    pIdxInfo->estimatedCost = (double)1;
    pIdxInfo->estimatedRows = 1;
    pIdxInfo->orderByConsumed = 1;
  }else if( idxNum==1 ){
    pIdxInfo->estimatedCost = (double)100;
    pIdxInfo->estimatedRows = 100;
  }else if( idxNum<99 ){
    pIdxInfo->estimatedCost = (double)5000;
    pIdxInfo->estimatedRows = 5000;
  }else{
    /* Full table scan */
    pIdxInfo->estimatedCost = (double)2147483647;
    pIdxInfo->estimatedRows = 2147483647;
  }
  pIdxInfo->idxNum = idxNum;
  return SQLITE_OK;
}

/*
** The xUpdate method is normally used for INSERT, REPLACE, UPDATE, and
** DELETE.  But this virtual table only supports INSERT and REPLACE.
** DELETE is accomplished by inserting a record with a value of NULL.
** UPDATE is achieved by using REPLACE.
*/
int lsm1Update(
  sqlite3_vtab *pVTab,
  int argc,
  sqlite3_value **argv,
  sqlite_int64 *pRowid
){
  lsm1_vtab *p = (lsm1_vtab*)pVTab;
  int nKey, nKey2;
  int i;
  int rc = LSM_OK;
  const u8 *pKey, *pKey2;
  unsigned char aKey[16];
  unsigned char pSpace[16];
  lsm1_vblob val;

  if( argc==1 ){
    /* DELETE the record whose key is argv[0] */
    lsm1KeyFromValue(p->keyType, argv[0], aKey, &pKey, &nKey);
    lsm_delete(p->pDb, pKey, nKey);
    return SQLITE_OK;
  }

  if( sqlite3_value_type(argv[0])!=SQLITE_NULL ){
    /* An UPDATE */
    lsm1KeyFromValue(p->keyType, argv[0], aKey, &pKey, &nKey);
    lsm1KeyFromValue(p->keyType, argv[1], pSpace, &pKey2, &nKey2);
    if( nKey!=nKey2 || memcmp(pKey, pKey2, nKey)!=0 ){
      /* The UPDATE changes the PRIMARY KEY value.  DELETE the old key */
      lsm_delete(p->pDb, pKey, nKey);
    }
    /* Fall through into the INSERT case to complete the UPDATE */
  }

  /* "INSERT INTO tab(lsm1_command) VALUES('....')" is used to implement
  ** special commands.
  */
  if( sqlite3_value_type(argv[3+p->nVal])!=SQLITE_NULL ){
    return SQLITE_OK;
  }
  lsm1KeyFromValue(p->keyType, argv[2], aKey, &pKey, &nKey);
  memset(&val, 0, sizeof(val));
  for(i=0; i<p->nVal; i++){
    sqlite3_value *pArg = argv[3+i];
    u8 eType = sqlite3_value_type(pArg);
    switch( eType ){
      case SQLITE_NULL: {
        lsm1VblobAppendVarint(&val, SQLITE_NULL);
        break;
      }
      case SQLITE_INTEGER: {
        sqlite3_int64 v = sqlite3_value_int64(pArg);
        if( v>=0 && v<=240/6 ){
          lsm1VblobAppendVarint(&val, v*6);
        }else{
          int n = lsm1PutSignedVarint64(pSpace, v);
          lsm1VblobAppendVarint(&val, SQLITE_INTEGER + n*6);
          lsm1VblobAppend(&val, pSpace, n);
        }
        break;
      }
      case SQLITE_FLOAT: {
        double r = sqlite3_value_double(pArg);
        lsm1VblobAppendVarint(&val, SQLITE_FLOAT + 8*6);
        lsm1VblobAppend(&val, (u8*)&r, sizeof(r));
        break;
      }
      case SQLITE_BLOB: {
        int n = sqlite3_value_bytes(pArg);
        lsm1VblobAppendVarint(&val, n*6 + SQLITE_BLOB);
        lsm1VblobAppend(&val, sqlite3_value_blob(pArg), n);
        break;
      }
      case SQLITE_TEXT: {
        int n = sqlite3_value_bytes(pArg);
        lsm1VblobAppendVarint(&val, n*6 + SQLITE_TEXT);
        lsm1VblobAppend(&val, sqlite3_value_text(pArg), n);
        break;
      }
    }
  }
  if( val.errNoMem ){
    return SQLITE_NOMEM;
  }
  rc = lsm_insert(p->pDb, pKey, nKey, val.a, val.n);
  sqlite3_free(val.a);
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}      

/* Begin a transaction
*/
static int lsm1Begin(sqlite3_vtab *pVtab){
  lsm1_vtab *p = (lsm1_vtab*)pVtab;
  int rc = lsm_begin(p->pDb, 1);
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}

/* Phase 1 of a transaction commit.
*/
static int lsm1Sync(sqlite3_vtab *pVtab){
  return SQLITE_OK;
}

/* Commit a transaction
*/
static int lsm1Commit(sqlite3_vtab *pVtab){
  lsm1_vtab *p = (lsm1_vtab*)pVtab;
  int rc = lsm_commit(p->pDb, 0);
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}

/* Rollback a transaction
*/
static int lsm1Rollback(sqlite3_vtab *pVtab){
  lsm1_vtab *p = (lsm1_vtab*)pVtab;
  int rc = lsm_rollback(p->pDb, 0);
  return rc==LSM_OK ? SQLITE_OK : SQLITE_ERROR;
}

/*
** This following structure defines all the methods for the 
** generate_lsm1 virtual table.
*/
static sqlite3_module lsm1Module = {
  0,                       /* iVersion */
  lsm1Connect,             /* xCreate */
  lsm1Connect,             /* xConnect */
  lsm1BestIndex,           /* xBestIndex */
  lsm1Disconnect,          /* xDisconnect */
  lsm1Disconnect,          /* xDestroy */
  lsm1Open,                /* xOpen - open a cursor */
  lsm1Close,               /* xClose - close a cursor */
  lsm1Filter,              /* xFilter - configure scan constraints */
  lsm1Next,                /* xNext - advance a cursor */
  lsm1Eof,                 /* xEof - check for end of scan */
  lsm1Column,              /* xColumn - read data */
  lsm1Rowid,               /* xRowid - read data */
  lsm1Update,              /* xUpdate */
  lsm1Begin,               /* xBegin */
  lsm1Sync,                /* xSync */
  lsm1Commit,              /* xCommit */
  lsm1Rollback,            /* xRollback */
  0,                       /* xFindMethod */
  0,                       /* xRename */
};


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_lsm_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  rc = sqlite3_create_module(db, "lsm1", &lsm1Module, 0);
  return rc;
}
