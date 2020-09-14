/*
** 2001 September 22
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This is the header file for the generic hash-table implementation
** used in SQLite.  We've modified it slightly to serve as a standalone
** hash table implementation for the full-text indexing module.
**
*/
#ifndef _FTS1_HASH_H_
#define _FTS1_HASH_H_

/* Forward declarations of structures. */
typedef struct fts1Hash fts1Hash;
typedef struct fts1HashElem fts1HashElem;

/* A complete hash table is an instance of the following structure.
** The internals of this structure are intended to be opaque -- client
** code should not attempt to access or modify the fields of this structure
** directly.  Change this structure only by using the routines below.
** However, many of the "procedures" and "functions" for modifying and
** accessing this structure are really macros, so we can't really make
** this structure opaque.
*/
struct fts1Hash {
  char keyClass;          /* HASH_INT, _POINTER, _STRING, _BINARY */
  char copyKey;           /* True if copy of key made on insert */
  int count;              /* Number of entries in this table */
  fts1HashElem *first;    /* The first element of the array */
  void *(*xMalloc)(int);  /* malloc() function to use */
  void (*xFree)(void *);  /* free() function to use */
  int htsize;             /* Number of buckets in the hash table */
  struct _fts1ht {        /* the hash table */
    int count;               /* Number of entries with this hash */
    fts1HashElem *chain;     /* Pointer to first entry with this hash */
  } *ht;
};

/* Each element in the hash table is an instance of the following 
** structure.  All elements are stored on a single doubly-linked list.
**
** Again, this structure is intended to be opaque, but it can't really
** be opaque because it is used by macros.
*/
struct fts1HashElem {
  fts1HashElem *next, *prev; /* Next and previous elements in the table */
  void *data;                /* Data associated with this element */
  void *pKey; int nKey;      /* Key associated with this element */
};

/*
** There are 2 different modes of operation for a hash table:
**
**   FTS1_HASH_STRING        pKey points to a string that is nKey bytes long
**                           (including the null-terminator, if any).  Case
**                           is respected in comparisons.
**
**   FTS1_HASH_BINARY        pKey points to binary data nKey bytes long. 
**                           memcmp() is used to compare keys.
**
** A copy of the key is made if the copyKey parameter to fts1HashInit is 1.  
*/
#define FTS1_HASH_STRING    1
#define FTS1_HASH_BINARY    2

/*
** Access routines.  To delete, insert a NULL pointer.
*/
void sqlite3Fts1HashInit(fts1Hash*, int keytype, int copyKey);
void *sqlite3Fts1HashInsert(fts1Hash*, const void *pKey, int nKey, void *pData);
void *sqlite3Fts1HashFind(const fts1Hash*, const void *pKey, int nKey);
void sqlite3Fts1HashClear(fts1Hash*);

/*
** Shorthand for the functions above
*/
#define fts1HashInit   sqlite3Fts1HashInit
#define fts1HashInsert sqlite3Fts1HashInsert
#define fts1HashFind   sqlite3Fts1HashFind
#define fts1HashClear  sqlite3Fts1HashClear

/*
** Macros for looping over all elements of a hash table.  The idiom is
** like this:
**
**   fts1Hash h;
**   fts1HashElem *p;
**   ...
**   for(p=fts1HashFirst(&h); p; p=fts1HashNext(p)){
**     SomeStructure *pData = fts1HashData(p);
**     // do something with pData
**   }
*/
#define fts1HashFirst(H)  ((H)->first)
#define fts1HashNext(E)   ((E)->next)
#define fts1HashData(E)   ((E)->data)
#define fts1HashKey(E)    ((E)->pKey)
#define fts1HashKeysize(E) ((E)->nKey)

/*
** Number of entries in a hash table
*/
#define fts1HashCount(H)  ((H)->count)

#endif /* _FTS1_HASH_H_ */
