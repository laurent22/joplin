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
#ifndef _FTS2_HASH_H_
#define _FTS2_HASH_H_

/* Forward declarations of structures. */
typedef struct fts2Hash fts2Hash;
typedef struct fts2HashElem fts2HashElem;

/* A complete hash table is an instance of the following structure.
** The internals of this structure are intended to be opaque -- client
** code should not attempt to access or modify the fields of this structure
** directly.  Change this structure only by using the routines below.
** However, many of the "procedures" and "functions" for modifying and
** accessing this structure are really macros, so we can't really make
** this structure opaque.
*/
struct fts2Hash {
  char keyClass;          /* HASH_INT, _POINTER, _STRING, _BINARY */
  char copyKey;           /* True if copy of key made on insert */
  int count;              /* Number of entries in this table */
  fts2HashElem *first;    /* The first element of the array */
  int htsize;             /* Number of buckets in the hash table */
  struct _fts2ht {        /* the hash table */
    int count;               /* Number of entries with this hash */
    fts2HashElem *chain;     /* Pointer to first entry with this hash */
  } *ht;
};

/* Each element in the hash table is an instance of the following 
** structure.  All elements are stored on a single doubly-linked list.
**
** Again, this structure is intended to be opaque, but it can't really
** be opaque because it is used by macros.
*/
struct fts2HashElem {
  fts2HashElem *next, *prev; /* Next and previous elements in the table */
  void *data;                /* Data associated with this element */
  void *pKey; int nKey;      /* Key associated with this element */
};

/*
** There are 2 different modes of operation for a hash table:
**
**   FTS2_HASH_STRING        pKey points to a string that is nKey bytes long
**                           (including the null-terminator, if any).  Case
**                           is respected in comparisons.
**
**   FTS2_HASH_BINARY        pKey points to binary data nKey bytes long. 
**                           memcmp() is used to compare keys.
**
** A copy of the key is made if the copyKey parameter to fts2HashInit is 1.  
*/
#define FTS2_HASH_STRING    1
#define FTS2_HASH_BINARY    2

/*
** Access routines.  To delete, insert a NULL pointer.
*/
void sqlite3Fts2HashInit(fts2Hash*, int keytype, int copyKey);
void *sqlite3Fts2HashInsert(fts2Hash*, const void *pKey, int nKey, void *pData);
void *sqlite3Fts2HashFind(const fts2Hash*, const void *pKey, int nKey);
void sqlite3Fts2HashClear(fts2Hash*);

/*
** Shorthand for the functions above
*/
#define fts2HashInit   sqlite3Fts2HashInit
#define fts2HashInsert sqlite3Fts2HashInsert
#define fts2HashFind   sqlite3Fts2HashFind
#define fts2HashClear  sqlite3Fts2HashClear

/*
** Macros for looping over all elements of a hash table.  The idiom is
** like this:
**
**   fts2Hash h;
**   fts2HashElem *p;
**   ...
**   for(p=fts2HashFirst(&h); p; p=fts2HashNext(p)){
**     SomeStructure *pData = fts2HashData(p);
**     // do something with pData
**   }
*/
#define fts2HashFirst(H)  ((H)->first)
#define fts2HashNext(E)   ((E)->next)
#define fts2HashData(E)   ((E)->data)
#define fts2HashKey(E)    ((E)->pKey)
#define fts2HashKeysize(E) ((E)->nKey)

/*
** Number of entries in a hash table
*/
#define fts2HashCount(H)  ((H)->count)

#endif /* _FTS2_HASH_H_ */
