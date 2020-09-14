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
** This is the implementation of generic hash-tables used in SQLite.
** We've modified it slightly to serve as a standalone hash table
** implementation for the full-text indexing module.
*/
#include <assert.h>
#include <stdlib.h>
#include <string.h>

#include "ft_hash.h"

void *malloc_and_zero(int n){
  void *p = malloc(n);
  if( p ){
    memset(p, 0, n);
  }
  return p;
}

/* Turn bulk memory into a hash table object by initializing the
** fields of the Hash structure.
**
** "pNew" is a pointer to the hash table that is to be initialized.
** keyClass is one of the constants HASH_INT, HASH_POINTER,
** HASH_BINARY, or HASH_STRING.  The value of keyClass 
** determines what kind of key the hash table will use.  "copyKey" is
** true if the hash table should make its own private copy of keys and
** false if it should just use the supplied pointer.  CopyKey only makes
** sense for HASH_STRING and HASH_BINARY and is ignored
** for other key classes.
*/
void HashInit(Hash *pNew, int keyClass, int copyKey){
  assert( pNew!=0 );
  assert( keyClass>=HASH_STRING && keyClass<=HASH_BINARY );
  pNew->keyClass = keyClass;
#if 0
  if( keyClass==HASH_POINTER || keyClass==HASH_INT ) copyKey = 0;
#endif
  pNew->copyKey = copyKey;
  pNew->first = 0;
  pNew->count = 0;
  pNew->htsize = 0;
  pNew->ht = 0;
  pNew->xMalloc = malloc_and_zero;
  pNew->xFree = free;
}

/* Remove all entries from a hash table.  Reclaim all memory.
** Call this routine to delete a hash table or to reset a hash table
** to the empty state.
*/
void HashClear(Hash *pH){
  HashElem *elem;         /* For looping over all elements of the table */

  assert( pH!=0 );
  elem = pH->first;
  pH->first = 0;
  if( pH->ht ) pH->xFree(pH->ht);
  pH->ht = 0;
  pH->htsize = 0;
  while( elem ){
    HashElem *next_elem = elem->next;
    if( pH->copyKey && elem->pKey ){
      pH->xFree(elem->pKey);
    }
    pH->xFree(elem);
    elem = next_elem;
  }
  pH->count = 0;
}

#if 0 /* NOT USED */
/*
** Hash and comparison functions when the mode is HASH_INT
*/
static int intHash(const void *pKey, int nKey){
  return nKey ^ (nKey<<8) ^ (nKey>>8);
}
static int intCompare(const void *pKey1, int n1, const void *pKey2, int n2){
  return n2 - n1;
}
#endif

#if 0 /* NOT USED */
/*
** Hash and comparison functions when the mode is HASH_POINTER
*/
static int ptrHash(const void *pKey, int nKey){
  uptr x = Addr(pKey);
  return x ^ (x<<8) ^ (x>>8);
}
static int ptrCompare(const void *pKey1, int n1, const void *pKey2, int n2){
  if( pKey1==pKey2 ) return 0;
  if( pKey1<pKey2 ) return -1;
  return 1;
}
#endif

/*
** Hash and comparison functions when the mode is HASH_STRING
*/
static int strHash(const void *pKey, int nKey){
  const char *z = (const char *)pKey;
  int h = 0;
  if( nKey<=0 ) nKey = (int) strlen(z);
  while( nKey > 0  ){
    h = (h<<3) ^ h ^ *z++;
    nKey--;
  }
  return h & 0x7fffffff;
}
static int strCompare(const void *pKey1, int n1, const void *pKey2, int n2){
  if( n1!=n2 ) return 1;
  return strncmp((const char*)pKey1,(const char*)pKey2,n1);
}

/*
** Hash and comparison functions when the mode is HASH_BINARY
*/
static int binHash(const void *pKey, int nKey){
  int h = 0;
  const char *z = (const char *)pKey;
  while( nKey-- > 0 ){
    h = (h<<3) ^ h ^ *(z++);
  }
  return h & 0x7fffffff;
}
static int binCompare(const void *pKey1, int n1, const void *pKey2, int n2){
  if( n1!=n2 ) return 1;
  return memcmp(pKey1,pKey2,n1);
}

/*
** Return a pointer to the appropriate hash function given the key class.
**
** The C syntax in this function definition may be unfamilar to some 
** programmers, so we provide the following additional explanation:
**
** The name of the function is "hashFunction".  The function takes a
** single parameter "keyClass".  The return value of hashFunction()
** is a pointer to another function.  Specifically, the return value
** of hashFunction() is a pointer to a function that takes two parameters
** with types "const void*" and "int" and returns an "int".
*/
static int (*hashFunction(int keyClass))(const void*,int){
#if 0  /* HASH_INT and HASH_POINTER are never used */
  switch( keyClass ){
    case HASH_INT:     return &intHash;
    case HASH_POINTER: return &ptrHash;
    case HASH_STRING:  return &strHash;
    case HASH_BINARY:  return &binHash;;
    default: break;
  }
  return 0;
#else
  if( keyClass==HASH_STRING ){
    return &strHash;
  }else{
    assert( keyClass==HASH_BINARY );
    return &binHash;
  }
#endif
}

/*
** Return a pointer to the appropriate hash function given the key class.
**
** For help in interpreted the obscure C code in the function definition,
** see the header comment on the previous function.
*/
static int (*compareFunction(int keyClass))(const void*,int,const void*,int){
#if 0 /* HASH_INT and HASH_POINTER are never used */
  switch( keyClass ){
    case HASH_INT:     return &intCompare;
    case HASH_POINTER: return &ptrCompare;
    case HASH_STRING:  return &strCompare;
    case HASH_BINARY:  return &binCompare;
    default: break;
  }
  return 0;
#else
  if( keyClass==HASH_STRING ){
    return &strCompare;
  }else{
    assert( keyClass==HASH_BINARY );
    return &binCompare;
  }
#endif
}

/* Link an element into the hash table
*/
static void insertElement(
  Hash *pH,              /* The complete hash table */
  struct _ht *pEntry,    /* The entry into which pNew is inserted */
  HashElem *pNew         /* The element to be inserted */
){
  HashElem *pHead;       /* First element already in pEntry */
  pHead = pEntry->chain;
  if( pHead ){
    pNew->next = pHead;
    pNew->prev = pHead->prev;
    if( pHead->prev ){ pHead->prev->next = pNew; }
    else             { pH->first = pNew; }
    pHead->prev = pNew;
  }else{
    pNew->next = pH->first;
    if( pH->first ){ pH->first->prev = pNew; }
    pNew->prev = 0;
    pH->first = pNew;
  }
  pEntry->count++;
  pEntry->chain = pNew;
}


/* Resize the hash table so that it cantains "new_size" buckets.
** "new_size" must be a power of 2.  The hash table might fail 
** to resize if sqliteMalloc() fails.
*/
static void rehash(Hash *pH, int new_size){
  struct _ht *new_ht;            /* The new hash table */
  HashElem *elem, *next_elem;    /* For looping over existing elements */
  int (*xHash)(const void*,int); /* The hash function */

  assert( (new_size & (new_size-1))==0 );
  new_ht = (struct _ht *)pH->xMalloc( new_size*sizeof(struct _ht) );
  if( new_ht==0 ) return;
  if( pH->ht ) pH->xFree(pH->ht);
  pH->ht = new_ht;
  pH->htsize = new_size;
  xHash = hashFunction(pH->keyClass);
  for(elem=pH->first, pH->first=0; elem; elem = next_elem){
    int h = (*xHash)(elem->pKey, elem->nKey) & (new_size-1);
    next_elem = elem->next;
    insertElement(pH, &new_ht[h], elem);
  }
}

/* This function (for internal use only) locates an element in an
** hash table that matches the given key.  The hash for this key has
** already been computed and is passed as the 4th parameter.
*/
static HashElem *findElementGivenHash(
  const Hash *pH,     /* The pH to be searched */
  const void *pKey,   /* The key we are searching for */
  int nKey,
  int h               /* The hash for this key. */
){
  HashElem *elem;                /* Used to loop thru the element list */
  int count;                     /* Number of elements left to test */
  int (*xCompare)(const void*,int,const void*,int);  /* comparison function */

  if( pH->ht ){
    struct _ht *pEntry = &pH->ht[h];
    elem = pEntry->chain;
    count = pEntry->count;
    xCompare = compareFunction(pH->keyClass);
    while( count-- && elem ){
      if( (*xCompare)(elem->pKey,elem->nKey,pKey,nKey)==0 ){ 
        return elem;
      }
      elem = elem->next;
    }
  }
  return 0;
}

/* Remove a single entry from the hash table given a pointer to that
** element and a hash on the element's key.
*/
static void removeElementGivenHash(
  Hash *pH,         /* The pH containing "elem" */
  HashElem* elem,   /* The element to be removed from the pH */
  int h             /* Hash value for the element */
){
  struct _ht *pEntry;
  if( elem->prev ){
    elem->prev->next = elem->next; 
  }else{
    pH->first = elem->next;
  }
  if( elem->next ){
    elem->next->prev = elem->prev;
  }
  pEntry = &pH->ht[h];
  if( pEntry->chain==elem ){
    pEntry->chain = elem->next;
  }
  pEntry->count--;
  if( pEntry->count<=0 ){
    pEntry->chain = 0;
  }
  if( pH->copyKey && elem->pKey ){
    pH->xFree(elem->pKey);
  }
  pH->xFree( elem );
  pH->count--;
  if( pH->count<=0 ){
    assert( pH->first==0 );
    assert( pH->count==0 );
    HashClear(pH);
  }
}

/* Attempt to locate an element of the hash table pH with a key
** that matches pKey,nKey.  Return the data for this element if it is
** found, or NULL if there is no match.
*/
void *HashFind(const Hash *pH, const void *pKey, int nKey){
  int h;             /* A hash on key */
  HashElem *elem;    /* The element that matches key */
  int (*xHash)(const void*,int);  /* The hash function */

  if( pH==0 || pH->ht==0 ) return 0;
  xHash = hashFunction(pH->keyClass);
  assert( xHash!=0 );
  h = (*xHash)(pKey,nKey);
  assert( (pH->htsize & (pH->htsize-1))==0 );
  elem = findElementGivenHash(pH,pKey,nKey, h & (pH->htsize-1));
  return elem ? elem->data : 0;
}

/* Insert an element into the hash table pH.  The key is pKey,nKey
** and the data is "data".
**
** If no element exists with a matching key, then a new
** element is created.  A copy of the key is made if the copyKey
** flag is set.  NULL is returned.
**
** If another element already exists with the same key, then the
** new data replaces the old data and the old data is returned.
** The key is not copied in this instance.  If a malloc fails, then
** the new data is returned and the hash table is unchanged.
**
** If the "data" parameter to this function is NULL, then the
** element corresponding to "key" is removed from the hash table.
*/
void *HashInsert(Hash *pH, const void *pKey, int nKey, void *data){
  int hraw;             /* Raw hash value of the key */
  int h;                /* the hash of the key modulo hash table size */
  HashElem *elem;       /* Used to loop thru the element list */
  HashElem *new_elem;   /* New element added to the pH */
  int (*xHash)(const void*,int);  /* The hash function */

  assert( pH!=0 );
  xHash = hashFunction(pH->keyClass);
  assert( xHash!=0 );
  hraw = (*xHash)(pKey, nKey);
  assert( (pH->htsize & (pH->htsize-1))==0 );
  h = hraw & (pH->htsize-1);
  elem = findElementGivenHash(pH,pKey,nKey,h);
  if( elem ){
    void *old_data = elem->data;
    if( data==0 ){
      removeElementGivenHash(pH,elem,h);
    }else{
      elem->data = data;
    }
    return old_data;
  }
  if( data==0 ) return 0;
  new_elem = (HashElem*)pH->xMalloc( sizeof(HashElem) );
  if( new_elem==0 ) return data;
  if( pH->copyKey && pKey!=0 ){
    new_elem->pKey = pH->xMalloc( nKey );
    if( new_elem->pKey==0 ){
      pH->xFree(new_elem);
      return data;
    }
    memcpy((void*)new_elem->pKey, pKey, nKey);
  }else{
    new_elem->pKey = (void*)pKey;
  }
  new_elem->nKey = nKey;
  pH->count++;
  if( pH->htsize==0 ){
    rehash(pH,8);
    if( pH->htsize==0 ){
      pH->count = 0;
      pH->xFree(new_elem);
      return data;
    }
  }
  if( pH->count > pH->htsize ){
    rehash(pH,pH->htsize*2);
  }
  assert( pH->htsize>0 );
  assert( (pH->htsize & (pH->htsize-1))==0 );
  h = hraw & (pH->htsize-1);
  insertElement(pH, &pH->ht[h], new_elem);
  new_elem->data = data;
  return 0;
}
