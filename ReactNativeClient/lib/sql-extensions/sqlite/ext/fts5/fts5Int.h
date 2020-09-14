/*
** 2014 May 31
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
*/
#ifndef _FTS5INT_H
#define _FTS5INT_H

#include "fts5.h"
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#include <string.h>
#include <assert.h>

#ifndef SQLITE_AMALGAMATION

typedef unsigned char  u8;
typedef unsigned int   u32;
typedef unsigned short u16;
typedef short i16;
typedef sqlite3_int64 i64;
typedef sqlite3_uint64 u64;

#ifndef ArraySize
# define ArraySize(x) ((int)(sizeof(x) / sizeof(x[0])))
#endif

#define testcase(x)
#define ALWAYS(x) 1
#define NEVER(x) 0

#define MIN(x,y) (((x) < (y)) ? (x) : (y))
#define MAX(x,y) (((x) > (y)) ? (x) : (y))

/*
** Constants for the largest and smallest possible 64-bit signed integers.
*/
# define LARGEST_INT64  (0xffffffff|(((i64)0x7fffffff)<<32))
# define SMALLEST_INT64 (((i64)-1) - LARGEST_INT64)

#endif

/* Truncate very long tokens to this many bytes. Hard limit is 
** (65536-1-1-4-9)==65521 bytes. The limiting factor is the 16-bit offset
** field that occurs at the start of each leaf page (see fts5_index.c). */
#define FTS5_MAX_TOKEN_SIZE 32768

/*
** Maximum number of prefix indexes on single FTS5 table. This must be
** less than 32. If it is set to anything large than that, an #error
** directive in fts5_index.c will cause the build to fail.
*/
#define FTS5_MAX_PREFIX_INDEXES 31

/*
** Maximum segments permitted in a single index 
*/
#define FTS5_MAX_SEGMENT 2000

#define FTS5_DEFAULT_NEARDIST 10
#define FTS5_DEFAULT_RANK     "bm25"

/* Name of rank and rowid columns */
#define FTS5_RANK_NAME "rank"
#define FTS5_ROWID_NAME "rowid"

#ifdef SQLITE_DEBUG
# define FTS5_CORRUPT sqlite3Fts5Corrupt()
int sqlite3Fts5Corrupt(void);
#else
# define FTS5_CORRUPT SQLITE_CORRUPT_VTAB
#endif

/*
** The assert_nc() macro is similar to the assert() macro, except that it
** is used for assert() conditions that are true only if it can be 
** guranteed that the database is not corrupt.
*/
#ifdef SQLITE_DEBUG
extern int sqlite3_fts5_may_be_corrupt;
# define assert_nc(x) assert(sqlite3_fts5_may_be_corrupt || (x))
#else
# define assert_nc(x) assert(x)
#endif

/*
** A version of memcmp() that does not cause asan errors if one of the pointer
** parameters is NULL and the number of bytes to compare is zero.
*/
#define fts5Memcmp(s1, s2, n) ((n)==0 ? 0 : memcmp((s1), (s2), (n)))

/* Mark a function parameter as unused, to suppress nuisance compiler
** warnings. */
#ifndef UNUSED_PARAM
# define UNUSED_PARAM(X)  (void)(X)
#endif

#ifndef UNUSED_PARAM2
# define UNUSED_PARAM2(X, Y)  (void)(X), (void)(Y)
#endif

typedef struct Fts5Global Fts5Global;
typedef struct Fts5Colset Fts5Colset;

/* If a NEAR() clump or phrase may only match a specific set of columns, 
** then an object of the following type is used to record the set of columns.
** Each entry in the aiCol[] array is a column that may be matched.
**
** This object is used by fts5_expr.c and fts5_index.c.
*/
struct Fts5Colset {
  int nCol;
  int aiCol[1];
};



/**************************************************************************
** Interface to code in fts5_config.c. fts5_config.c contains contains code
** to parse the arguments passed to the CREATE VIRTUAL TABLE statement.
*/

typedef struct Fts5Config Fts5Config;

/*
** An instance of the following structure encodes all information that can
** be gleaned from the CREATE VIRTUAL TABLE statement.
**
** And all information loaded from the %_config table.
**
** nAutomerge:
**   The minimum number of segments that an auto-merge operation should
**   attempt to merge together. A value of 1 sets the object to use the 
**   compile time default. Zero disables auto-merge altogether.
**
** zContent:
**
** zContentRowid:
**   The value of the content_rowid= option, if one was specified. Or 
**   the string "rowid" otherwise. This text is not quoted - if it is
**   used as part of an SQL statement it needs to be quoted appropriately.
**
** zContentExprlist:
**
** pzErrmsg:
**   This exists in order to allow the fts5_index.c module to return a 
**   decent error message if it encounters a file-format version it does
**   not understand.
**
** bColumnsize:
**   True if the %_docsize table is created.
**
** bPrefixIndex:
**   This is only used for debugging. If set to false, any prefix indexes
**   are ignored. This value is configured using:
**
**       INSERT INTO tbl(tbl, rank) VALUES('prefix-index', $bPrefixIndex);
**
*/
struct Fts5Config {
  sqlite3 *db;                    /* Database handle */
  char *zDb;                      /* Database holding FTS index (e.g. "main") */
  char *zName;                    /* Name of FTS index */
  int nCol;                       /* Number of columns */
  char **azCol;                   /* Column names */
  u8 *abUnindexed;                /* True for unindexed columns */
  int nPrefix;                    /* Number of prefix indexes */
  int *aPrefix;                   /* Sizes in bytes of nPrefix prefix indexes */
  int eContent;                   /* An FTS5_CONTENT value */
  char *zContent;                 /* content table */ 
  char *zContentRowid;            /* "content_rowid=" option value */ 
  int bColumnsize;                /* "columnsize=" option value (dflt==1) */
  int eDetail;                    /* FTS5_DETAIL_XXX value */
  char *zContentExprlist;
  Fts5Tokenizer *pTok;
  fts5_tokenizer *pTokApi;
  int bLock;                      /* True when table is preparing statement */

  /* Values loaded from the %_config table */
  int iCookie;                    /* Incremented when %_config is modified */
  int pgsz;                       /* Approximate page size used in %_data */
  int nAutomerge;                 /* 'automerge' setting */
  int nCrisisMerge;               /* Maximum allowed segments per level */
  int nUsermerge;                 /* 'usermerge' setting */
  int nHashSize;                  /* Bytes of memory for in-memory hash */
  char *zRank;                    /* Name of rank function */
  char *zRankArgs;                /* Arguments to rank function */

  /* If non-NULL, points to sqlite3_vtab.base.zErrmsg. Often NULL. */
  char **pzErrmsg;

#ifdef SQLITE_DEBUG
  int bPrefixIndex;               /* True to use prefix-indexes */
#endif
};

/* Current expected value of %_config table 'version' field */
#define FTS5_CURRENT_VERSION 4

#define FTS5_CONTENT_NORMAL   0
#define FTS5_CONTENT_NONE     1
#define FTS5_CONTENT_EXTERNAL 2

#define FTS5_DETAIL_FULL    0
#define FTS5_DETAIL_NONE    1
#define FTS5_DETAIL_COLUMNS 2



int sqlite3Fts5ConfigParse(
    Fts5Global*, sqlite3*, int, const char **, Fts5Config**, char**
);
void sqlite3Fts5ConfigFree(Fts5Config*);

int sqlite3Fts5ConfigDeclareVtab(Fts5Config *pConfig);

int sqlite3Fts5Tokenize(
  Fts5Config *pConfig,            /* FTS5 Configuration object */
  int flags,                      /* FTS5_TOKENIZE_* flags */
  const char *pText, int nText,   /* Text to tokenize */
  void *pCtx,                     /* Context passed to xToken() */
  int (*xToken)(void*, int, const char*, int, int, int)    /* Callback */
);

void sqlite3Fts5Dequote(char *z);

/* Load the contents of the %_config table */
int sqlite3Fts5ConfigLoad(Fts5Config*, int);

/* Set the value of a single config attribute */
int sqlite3Fts5ConfigSetValue(Fts5Config*, const char*, sqlite3_value*, int*);

int sqlite3Fts5ConfigParseRank(const char*, char**, char**);

/*
** End of interface to code in fts5_config.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_buffer.c.
*/

/*
** Buffer object for the incremental building of string data.
*/
typedef struct Fts5Buffer Fts5Buffer;
struct Fts5Buffer {
  u8 *p;
  int n;
  int nSpace;
};

int sqlite3Fts5BufferSize(int*, Fts5Buffer*, u32);
void sqlite3Fts5BufferAppendVarint(int*, Fts5Buffer*, i64);
void sqlite3Fts5BufferAppendBlob(int*, Fts5Buffer*, u32, const u8*);
void sqlite3Fts5BufferAppendString(int *, Fts5Buffer*, const char*);
void sqlite3Fts5BufferFree(Fts5Buffer*);
void sqlite3Fts5BufferZero(Fts5Buffer*);
void sqlite3Fts5BufferSet(int*, Fts5Buffer*, int, const u8*);
void sqlite3Fts5BufferAppendPrintf(int *, Fts5Buffer*, char *zFmt, ...);

char *sqlite3Fts5Mprintf(int *pRc, const char *zFmt, ...);

#define fts5BufferZero(x)             sqlite3Fts5BufferZero(x)
#define fts5BufferAppendVarint(a,b,c) sqlite3Fts5BufferAppendVarint(a,b,c)
#define fts5BufferFree(a)             sqlite3Fts5BufferFree(a)
#define fts5BufferAppendBlob(a,b,c,d) sqlite3Fts5BufferAppendBlob(a,b,c,d)
#define fts5BufferSet(a,b,c,d)        sqlite3Fts5BufferSet(a,b,c,d)

#define fts5BufferGrow(pRc,pBuf,nn) ( \
  (u32)((pBuf)->n) + (u32)(nn) <= (u32)((pBuf)->nSpace) ? 0 : \
    sqlite3Fts5BufferSize((pRc),(pBuf),(nn)+(pBuf)->n) \
)

/* Write and decode big-endian 32-bit integer values */
void sqlite3Fts5Put32(u8*, int);
int sqlite3Fts5Get32(const u8*);

#define FTS5_POS2COLUMN(iPos) (int)(iPos >> 32)
#define FTS5_POS2OFFSET(iPos) (int)(iPos & 0x7FFFFFFF)

typedef struct Fts5PoslistReader Fts5PoslistReader;
struct Fts5PoslistReader {
  /* Variables used only by sqlite3Fts5PoslistIterXXX() functions. */
  const u8 *a;                    /* Position list to iterate through */
  int n;                          /* Size of buffer at a[] in bytes */
  int i;                          /* Current offset in a[] */

  u8 bFlag;                       /* For client use (any custom purpose) */

  /* Output variables */
  u8 bEof;                        /* Set to true at EOF */
  i64 iPos;                       /* (iCol<<32) + iPos */
};
int sqlite3Fts5PoslistReaderInit(
  const u8 *a, int n,             /* Poslist buffer to iterate through */
  Fts5PoslistReader *pIter        /* Iterator object to initialize */
);
int sqlite3Fts5PoslistReaderNext(Fts5PoslistReader*);

typedef struct Fts5PoslistWriter Fts5PoslistWriter;
struct Fts5PoslistWriter {
  i64 iPrev;
};
int sqlite3Fts5PoslistWriterAppend(Fts5Buffer*, Fts5PoslistWriter*, i64);
void sqlite3Fts5PoslistSafeAppend(Fts5Buffer*, i64*, i64);

int sqlite3Fts5PoslistNext64(
  const u8 *a, int n,             /* Buffer containing poslist */
  int *pi,                        /* IN/OUT: Offset within a[] */
  i64 *piOff                      /* IN/OUT: Current offset */
);

/* Malloc utility */
void *sqlite3Fts5MallocZero(int *pRc, sqlite3_int64 nByte);
char *sqlite3Fts5Strndup(int *pRc, const char *pIn, int nIn);

/* Character set tests (like isspace(), isalpha() etc.) */
int sqlite3Fts5IsBareword(char t);


/* Bucket of terms object used by the integrity-check in offsets=0 mode. */
typedef struct Fts5Termset Fts5Termset;
int sqlite3Fts5TermsetNew(Fts5Termset**);
int sqlite3Fts5TermsetAdd(Fts5Termset*, int, const char*, int, int *pbPresent);
void sqlite3Fts5TermsetFree(Fts5Termset*);

/*
** End of interface to code in fts5_buffer.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_index.c. fts5_index.c contains contains code
** to access the data stored in the %_data table.
*/

typedef struct Fts5Index Fts5Index;
typedef struct Fts5IndexIter Fts5IndexIter;

struct Fts5IndexIter {
  i64 iRowid;
  const u8 *pData;
  int nData;
  u8 bEof;
};

#define sqlite3Fts5IterEof(x) ((x)->bEof)

/*
** Values used as part of the flags argument passed to IndexQuery().
*/
#define FTS5INDEX_QUERY_PREFIX     0x0001   /* Prefix query */
#define FTS5INDEX_QUERY_DESC       0x0002   /* Docs in descending rowid order */
#define FTS5INDEX_QUERY_TEST_NOIDX 0x0004   /* Do not use prefix index */
#define FTS5INDEX_QUERY_SCAN       0x0008   /* Scan query (fts5vocab) */

/* The following are used internally by the fts5_index.c module. They are
** defined here only to make it easier to avoid clashes with the flags
** above. */
#define FTS5INDEX_QUERY_SKIPEMPTY  0x0010
#define FTS5INDEX_QUERY_NOOUTPUT   0x0020

/*
** Create/destroy an Fts5Index object.
*/
int sqlite3Fts5IndexOpen(Fts5Config *pConfig, int bCreate, Fts5Index**, char**);
int sqlite3Fts5IndexClose(Fts5Index *p);

/*
** Return a simple checksum value based on the arguments.
*/
u64 sqlite3Fts5IndexEntryCksum(
  i64 iRowid, 
  int iCol, 
  int iPos, 
  int iIdx,
  const char *pTerm,
  int nTerm
);

/*
** Argument p points to a buffer containing utf-8 text that is n bytes in 
** size. Return the number of bytes in the nChar character prefix of the
** buffer, or 0 if there are less than nChar characters in total.
*/
int sqlite3Fts5IndexCharlenToBytelen(
  const char *p, 
  int nByte, 
  int nChar
);

/*
** Open a new iterator to iterate though all rowids that match the 
** specified token or token prefix.
*/
int sqlite3Fts5IndexQuery(
  Fts5Index *p,                   /* FTS index to query */
  const char *pToken, int nToken, /* Token (or prefix) to query for */
  int flags,                      /* Mask of FTS5INDEX_QUERY_X flags */
  Fts5Colset *pColset,            /* Match these columns only */
  Fts5IndexIter **ppIter          /* OUT: New iterator object */
);

/*
** The various operations on open token or token prefix iterators opened
** using sqlite3Fts5IndexQuery().
*/
int sqlite3Fts5IterNext(Fts5IndexIter*);
int sqlite3Fts5IterNextFrom(Fts5IndexIter*, i64 iMatch);

/*
** Close an iterator opened by sqlite3Fts5IndexQuery().
*/
void sqlite3Fts5IterClose(Fts5IndexIter*);

/*
** Close the reader blob handle, if it is open.
*/
void sqlite3Fts5IndexCloseReader(Fts5Index*);

/*
** This interface is used by the fts5vocab module.
*/
const char *sqlite3Fts5IterTerm(Fts5IndexIter*, int*);
int sqlite3Fts5IterNextScan(Fts5IndexIter*);


/*
** Insert or remove data to or from the index. Each time a document is 
** added to or removed from the index, this function is called one or more
** times.
**
** For an insert, it must be called once for each token in the new document.
** If the operation is a delete, it must be called (at least) once for each
** unique token in the document with an iCol value less than zero. The iPos
** argument is ignored for a delete.
*/
int sqlite3Fts5IndexWrite(
  Fts5Index *p,                   /* Index to write to */
  int iCol,                       /* Column token appears in (-ve -> delete) */
  int iPos,                       /* Position of token within column */
  const char *pToken, int nToken  /* Token to add or remove to or from index */
);

/*
** Indicate that subsequent calls to sqlite3Fts5IndexWrite() pertain to
** document iDocid.
*/
int sqlite3Fts5IndexBeginWrite(
  Fts5Index *p,                   /* Index to write to */
  int bDelete,                    /* True if current operation is a delete */
  i64 iDocid                      /* Docid to add or remove data from */
);

/*
** Flush any data stored in the in-memory hash tables to the database.
** Also close any open blob handles.
*/
int sqlite3Fts5IndexSync(Fts5Index *p);

/*
** Discard any data stored in the in-memory hash tables. Do not write it
** to the database. Additionally, assume that the contents of the %_data
** table may have changed on disk. So any in-memory caches of %_data 
** records must be invalidated.
*/
int sqlite3Fts5IndexRollback(Fts5Index *p);

/*
** Get or set the "averages" values.
*/
int sqlite3Fts5IndexGetAverages(Fts5Index *p, i64 *pnRow, i64 *anSize);
int sqlite3Fts5IndexSetAverages(Fts5Index *p, const u8*, int);

/*
** Functions called by the storage module as part of integrity-check.
*/
int sqlite3Fts5IndexIntegrityCheck(Fts5Index*, u64 cksum);

/* 
** Called during virtual module initialization to register UDF 
** fts5_decode() with SQLite 
*/
int sqlite3Fts5IndexInit(sqlite3*);

int sqlite3Fts5IndexSetCookie(Fts5Index*, int);

/*
** Return the total number of entries read from the %_data table by 
** this connection since it was created.
*/
int sqlite3Fts5IndexReads(Fts5Index *p);

int sqlite3Fts5IndexReinit(Fts5Index *p);
int sqlite3Fts5IndexOptimize(Fts5Index *p);
int sqlite3Fts5IndexMerge(Fts5Index *p, int nMerge);
int sqlite3Fts5IndexReset(Fts5Index *p);

int sqlite3Fts5IndexLoadConfig(Fts5Index *p);

/*
** End of interface to code in fts5_index.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_varint.c. 
*/
int sqlite3Fts5GetVarint32(const unsigned char *p, u32 *v);
int sqlite3Fts5GetVarintLen(u32 iVal);
u8 sqlite3Fts5GetVarint(const unsigned char*, u64*);
int sqlite3Fts5PutVarint(unsigned char *p, u64 v);

#define fts5GetVarint32(a,b) sqlite3Fts5GetVarint32(a,(u32*)&b)
#define fts5GetVarint    sqlite3Fts5GetVarint

#define fts5FastGetVarint32(a, iOff, nVal) {      \
  nVal = (a)[iOff++];                             \
  if( nVal & 0x80 ){                              \
    iOff--;                                       \
    iOff += fts5GetVarint32(&(a)[iOff], nVal);    \
  }                                               \
}


/*
** End of interface to code in fts5_varint.c.
**************************************************************************/


/**************************************************************************
** Interface to code in fts5_main.c. 
*/

/*
** Virtual-table object.
*/
typedef struct Fts5Table Fts5Table;
struct Fts5Table {
  sqlite3_vtab base;              /* Base class used by SQLite core */
  Fts5Config *pConfig;            /* Virtual table configuration */
  Fts5Index *pIndex;              /* Full-text index */
};

int sqlite3Fts5GetTokenizer(
  Fts5Global*, 
  const char **azArg,
  int nArg,
  Fts5Tokenizer**,
  fts5_tokenizer**,
  char **pzErr
);

Fts5Table *sqlite3Fts5TableFromCsrid(Fts5Global*, i64);

int sqlite3Fts5FlushToDisk(Fts5Table*);

/*
** End of interface to code in fts5.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_hash.c. 
*/
typedef struct Fts5Hash Fts5Hash;

/*
** Create a hash table, free a hash table.
*/
int sqlite3Fts5HashNew(Fts5Config*, Fts5Hash**, int *pnSize);
void sqlite3Fts5HashFree(Fts5Hash*);

int sqlite3Fts5HashWrite(
  Fts5Hash*,
  i64 iRowid,                     /* Rowid for this entry */
  int iCol,                       /* Column token appears in (-ve -> delete) */
  int iPos,                       /* Position of token within column */
  char bByte,
  const char *pToken, int nToken  /* Token to add or remove to or from index */
);

/*
** Empty (but do not delete) a hash table.
*/
void sqlite3Fts5HashClear(Fts5Hash*);

int sqlite3Fts5HashQuery(
  Fts5Hash*,                      /* Hash table to query */
  int nPre,
  const char *pTerm, int nTerm,   /* Query term */
  void **ppObj,                   /* OUT: Pointer to doclist for pTerm */
  int *pnDoclist                  /* OUT: Size of doclist in bytes */
);

int sqlite3Fts5HashScanInit(
  Fts5Hash*,                      /* Hash table to query */
  const char *pTerm, int nTerm    /* Query prefix */
);
void sqlite3Fts5HashScanNext(Fts5Hash*);
int sqlite3Fts5HashScanEof(Fts5Hash*);
void sqlite3Fts5HashScanEntry(Fts5Hash *,
  const char **pzTerm,            /* OUT: term (nul-terminated) */
  const u8 **ppDoclist,           /* OUT: pointer to doclist */
  int *pnDoclist                  /* OUT: size of doclist in bytes */
);


/*
** End of interface to code in fts5_hash.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_storage.c. fts5_storage.c contains contains 
** code to access the data stored in the %_content and %_docsize tables.
*/

#define FTS5_STMT_SCAN_ASC  0     /* SELECT rowid, * FROM ... ORDER BY 1 ASC */
#define FTS5_STMT_SCAN_DESC 1     /* SELECT rowid, * FROM ... ORDER BY 1 DESC */
#define FTS5_STMT_LOOKUP    2     /* SELECT rowid, * FROM ... WHERE rowid=? */

typedef struct Fts5Storage Fts5Storage;

int sqlite3Fts5StorageOpen(Fts5Config*, Fts5Index*, int, Fts5Storage**, char**);
int sqlite3Fts5StorageClose(Fts5Storage *p);
int sqlite3Fts5StorageRename(Fts5Storage*, const char *zName);

int sqlite3Fts5DropAll(Fts5Config*);
int sqlite3Fts5CreateTable(Fts5Config*, const char*, const char*, int, char **);

int sqlite3Fts5StorageDelete(Fts5Storage *p, i64, sqlite3_value**);
int sqlite3Fts5StorageContentInsert(Fts5Storage *p, sqlite3_value**, i64*);
int sqlite3Fts5StorageIndexInsert(Fts5Storage *p, sqlite3_value**, i64);

int sqlite3Fts5StorageIntegrity(Fts5Storage *p);

int sqlite3Fts5StorageStmt(Fts5Storage *p, int eStmt, sqlite3_stmt**, char**);
void sqlite3Fts5StorageStmtRelease(Fts5Storage *p, int eStmt, sqlite3_stmt*);

int sqlite3Fts5StorageDocsize(Fts5Storage *p, i64 iRowid, int *aCol);
int sqlite3Fts5StorageSize(Fts5Storage *p, int iCol, i64 *pnAvg);
int sqlite3Fts5StorageRowCount(Fts5Storage *p, i64 *pnRow);

int sqlite3Fts5StorageSync(Fts5Storage *p);
int sqlite3Fts5StorageRollback(Fts5Storage *p);

int sqlite3Fts5StorageConfigValue(
    Fts5Storage *p, const char*, sqlite3_value*, int
);

int sqlite3Fts5StorageDeleteAll(Fts5Storage *p);
int sqlite3Fts5StorageRebuild(Fts5Storage *p);
int sqlite3Fts5StorageOptimize(Fts5Storage *p);
int sqlite3Fts5StorageMerge(Fts5Storage *p, int nMerge);
int sqlite3Fts5StorageReset(Fts5Storage *p);

/*
** End of interface to code in fts5_storage.c.
**************************************************************************/


/**************************************************************************
** Interface to code in fts5_expr.c. 
*/
typedef struct Fts5Expr Fts5Expr;
typedef struct Fts5ExprNode Fts5ExprNode;
typedef struct Fts5Parse Fts5Parse;
typedef struct Fts5Token Fts5Token;
typedef struct Fts5ExprPhrase Fts5ExprPhrase;
typedef struct Fts5ExprNearset Fts5ExprNearset;

struct Fts5Token {
  const char *p;                  /* Token text (not NULL terminated) */
  int n;                          /* Size of buffer p in bytes */
};

/* Parse a MATCH expression. */
int sqlite3Fts5ExprNew(
  Fts5Config *pConfig, 
  int iCol,                       /* Column on LHS of MATCH operator */
  const char *zExpr,
  Fts5Expr **ppNew, 
  char **pzErr
);

/*
** for(rc = sqlite3Fts5ExprFirst(pExpr, pIdx, bDesc);
**     rc==SQLITE_OK && 0==sqlite3Fts5ExprEof(pExpr);
**     rc = sqlite3Fts5ExprNext(pExpr)
** ){
**   // The document with rowid iRowid matches the expression!
**   i64 iRowid = sqlite3Fts5ExprRowid(pExpr);
** }
*/
int sqlite3Fts5ExprFirst(Fts5Expr*, Fts5Index *pIdx, i64 iMin, int bDesc);
int sqlite3Fts5ExprNext(Fts5Expr*, i64 iMax);
int sqlite3Fts5ExprEof(Fts5Expr*);
i64 sqlite3Fts5ExprRowid(Fts5Expr*);

void sqlite3Fts5ExprFree(Fts5Expr*);
int sqlite3Fts5ExprAnd(Fts5Expr **pp1, Fts5Expr *p2);

/* Called during startup to register a UDF with SQLite */
int sqlite3Fts5ExprInit(Fts5Global*, sqlite3*);

int sqlite3Fts5ExprPhraseCount(Fts5Expr*);
int sqlite3Fts5ExprPhraseSize(Fts5Expr*, int iPhrase);
int sqlite3Fts5ExprPoslist(Fts5Expr*, int, const u8 **);

typedef struct Fts5PoslistPopulator Fts5PoslistPopulator;
Fts5PoslistPopulator *sqlite3Fts5ExprClearPoslists(Fts5Expr*, int);
int sqlite3Fts5ExprPopulatePoslists(
    Fts5Config*, Fts5Expr*, Fts5PoslistPopulator*, int, const char*, int
);
void sqlite3Fts5ExprCheckPoslists(Fts5Expr*, i64);

int sqlite3Fts5ExprClonePhrase(Fts5Expr*, int, Fts5Expr**);

int sqlite3Fts5ExprPhraseCollist(Fts5Expr *, int, const u8 **, int *);

/*******************************************
** The fts5_expr.c API above this point is used by the other hand-written
** C code in this module. The interfaces below this point are called by
** the parser code in fts5parse.y.  */

void sqlite3Fts5ParseError(Fts5Parse *pParse, const char *zFmt, ...);

Fts5ExprNode *sqlite3Fts5ParseNode(
  Fts5Parse *pParse,
  int eType,
  Fts5ExprNode *pLeft,
  Fts5ExprNode *pRight,
  Fts5ExprNearset *pNear
);

Fts5ExprNode *sqlite3Fts5ParseImplicitAnd(
  Fts5Parse *pParse,
  Fts5ExprNode *pLeft,
  Fts5ExprNode *pRight
);

Fts5ExprPhrase *sqlite3Fts5ParseTerm(
  Fts5Parse *pParse, 
  Fts5ExprPhrase *pPhrase, 
  Fts5Token *pToken,
  int bPrefix
);

void sqlite3Fts5ParseSetCaret(Fts5ExprPhrase*);

Fts5ExprNearset *sqlite3Fts5ParseNearset(
  Fts5Parse*, 
  Fts5ExprNearset*,
  Fts5ExprPhrase* 
);

Fts5Colset *sqlite3Fts5ParseColset(
  Fts5Parse*, 
  Fts5Colset*, 
  Fts5Token *
);

void sqlite3Fts5ParsePhraseFree(Fts5ExprPhrase*);
void sqlite3Fts5ParseNearsetFree(Fts5ExprNearset*);
void sqlite3Fts5ParseNodeFree(Fts5ExprNode*);

void sqlite3Fts5ParseSetDistance(Fts5Parse*, Fts5ExprNearset*, Fts5Token*);
void sqlite3Fts5ParseSetColset(Fts5Parse*, Fts5ExprNode*, Fts5Colset*);
Fts5Colset *sqlite3Fts5ParseColsetInvert(Fts5Parse*, Fts5Colset*);
void sqlite3Fts5ParseFinished(Fts5Parse *pParse, Fts5ExprNode *p);
void sqlite3Fts5ParseNear(Fts5Parse *pParse, Fts5Token*);

/*
** End of interface to code in fts5_expr.c.
**************************************************************************/



/**************************************************************************
** Interface to code in fts5_aux.c. 
*/

int sqlite3Fts5AuxInit(fts5_api*);
/*
** End of interface to code in fts5_aux.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_tokenizer.c. 
*/

int sqlite3Fts5TokenizerInit(fts5_api*);
/*
** End of interface to code in fts5_tokenizer.c.
**************************************************************************/

/**************************************************************************
** Interface to code in fts5_vocab.c. 
*/

int sqlite3Fts5VocabInit(Fts5Global*, sqlite3*);

/*
** End of interface to code in fts5_vocab.c.
**************************************************************************/


/**************************************************************************
** Interface to automatically generated code in fts5_unicode2.c. 
*/
int sqlite3Fts5UnicodeIsdiacritic(int c);
int sqlite3Fts5UnicodeFold(int c, int bRemoveDiacritic);

int sqlite3Fts5UnicodeCatParse(const char*, u8*);
int sqlite3Fts5UnicodeCategory(u32 iCode);
void sqlite3Fts5UnicodeAscii(u8*, u8*);
/*
** End of interface to code in fts5_unicode2.c.
**************************************************************************/

#endif
