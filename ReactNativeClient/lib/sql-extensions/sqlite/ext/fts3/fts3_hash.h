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
#ifndef _FTS3_HASH_H_
#define _FTS3_HASH_H_

/* Forward declarations of structures. */
typedef struct Fts3Hash Fts3Hash;
typedef struct Fts3HashElem Fts3HashElem;

/* A complete hash table is an instance of the following structure.
** The internals of this structure are intended to be opaque -- client
** code should not attempt to access or modify the fields of this structure
** directly.  Change this structure only by using the routines below.
** However, many of the "procedures" and "functions" for modifying and
** accessing this structure are really macros, so we can't really make
** this structure opaque.
*/
struct Fts3Hash {
  char keyClass;          /* HASH_INT, _POINTER, _STRING, _BINARY */
  char copyKey;           /* True if copy of key made on insert */
  int count;              /* Number of entries in this table */
  Fts3HashElem *first;    /* The first element of the array */
  int htsize;             /* Number of buckets in the hash table */
  struct _fts3ht {        /* the hash table */
    int count;               /* Number of entries with this hash */
    Fts3HashElem *chain;     /* Pointer to first entry with this hash */
  } *ht;
};

/* Each element in the hash table is an instance of the following 
** structure.  All elements are stored on a single doubly-linked list.
**
** Again, this structure is intended to be opaque, but it can't really
** be opaque because it is used by macros.
*/
struct Fts3HashElem {
  Fts3HashElem *next, *prev; /* Next and previous elements in the table */
  void *data;                /* Data associated with this element */
  void *pKey; int nKey;      /* Key associated with this element */
};

/*
** There are 2 different modes of operation for a hash table:
**
**   FTS3_HASH_STRING        pKey points to a string that is nKey bytes long
**                           (including the null-terminator, if any).  Case
**                           is respected in comparisons.
**
**   FTS3_HASH_BINARY        pKey points to binary data nKey bytes long. 
**                           memcmp() is used to compare keys.
**
** A copy of the key is made if the copyKey parameter to fts3HashInit is 1.  
*/
#define FTS3_HASH_STRING    1
#define FTS3_HASH_BINARY    2

/*
** Access routines.  To delete, insert a NULL pointer.
*/
void sqlite3Fts3HashInit(Fts3Hash *pNew, char keyClass, char copyKey);
void *sqlite3Fts3HashInsert(Fts3Hash*, const void *pKey, int nKey, void *pData);
void *sqlite3Fts3HashFind(const Fts3Hash*, const void *pKey, int nKey);
void sqlite3Fts3HashClear(Fts3Hash*);
Fts3HashElem *sqlite3Fts3HashFindElem(const Fts3Hash *, const void *, int);

/*
** Shorthand for the functions above
*/
#define fts3HashInit     sqlite3Fts3HashInit
#define fts3HashInsert   sqlite3Fts3HashInsert
#define fts3HashFind     sqlite3Fts3HashFind
#define fts3HashClear    sqlite3Fts3HashClear
#define fts3HashFindElem sqlite3Fts3HashFindElem

/*
** Macros for looping over all elements of a hash table.  The idiom is
** like this:
**
**   Fts3Hash h;
**   Fts3HashElem *p;
**   ...
**   for(p=fts3HashFirst(&h); p; p=fts3HashNext(p)){
**     SomeStructure *pData = fts3HashData(p);
**     // do something with pData
**   }
*/
#define fts3HashFirst(H)  ((H)->first)
#define fts3HashNext(E)   ((E)->next)
#define fts3HashData(E)   ((E)->data)
#define fts3HashKey(E)    ((E)->pKey)
#define fts3HashKeysize(E) ((E)->nKey)

/*
** Number of entries in a hash table
*/
#define fts3HashCount(H)  ((H)->count)

#endif /* _FTS3_HASH_H_ */
