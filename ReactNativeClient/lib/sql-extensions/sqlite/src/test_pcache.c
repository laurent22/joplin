/*
** 2008 November 18
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
** This file contains code used for testing the SQLite system.
** None of the code in this file goes into a deliverable build.
** 
** This file contains an application-defined pager cache
** implementation that can be plugged in in place of the
** default pcache.  This alternative pager cache will throw
** some errors that the default cache does not.
**
** This pagecache implementation is designed for simplicity
** not speed.  
*/
#include "sqlite3.h"
#include <string.h>
#include <assert.h>

/*
** Global data used by this test implementation.  There is no
** mutexing, which means this page cache will not work in a
** multi-threaded test.
*/
typedef struct testpcacheGlobalType testpcacheGlobalType;
struct testpcacheGlobalType {
  void *pDummy;             /* Dummy allocation to simulate failures */
  int nInstance;            /* Number of current instances */
  unsigned discardChance;   /* Chance of discarding on an unpin (0-100) */
  unsigned prngSeed;        /* Seed for the PRNG */
  unsigned highStress;      /* Call xStress agressively */
};
static testpcacheGlobalType testpcacheGlobal;

/*
** Initializer.
**
** Verify that the initializer is only called when the system is
** uninitialized.  Allocate some memory and report SQLITE_NOMEM if
** the allocation fails.  This provides a means to test the recovery
** from a failed initialization attempt.  It also verifies that the
** the destructor always gets call - otherwise there would be a
** memory leak.
*/
static int testpcacheInit(void *pArg){
  assert( pArg==(void*)&testpcacheGlobal );
  assert( testpcacheGlobal.pDummy==0 );
  assert( testpcacheGlobal.nInstance==0 );
  testpcacheGlobal.pDummy = sqlite3_malloc(10);
  return testpcacheGlobal.pDummy==0 ? SQLITE_NOMEM : SQLITE_OK;
}

/*
** Destructor
**
** Verify that this is only called after initialization.
** Free the memory allocated by the initializer.
*/
static void testpcacheShutdown(void *pArg){
  assert( pArg==(void*)&testpcacheGlobal );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance==0 );
  sqlite3_free( testpcacheGlobal.pDummy );
  testpcacheGlobal.pDummy = 0;
}

/*
** Number of pages in a cache.
**
** The number of pages is a hard upper bound in this test module.
** If more pages are requested, sqlite3PcacheFetch() returns NULL.
**
** If testing with in-memory temp tables, provide a larger pcache.
** Some of the test cases need this.
*/
#if defined(SQLITE_TEMP_STORE) && SQLITE_TEMP_STORE>=2
# define TESTPCACHE_NPAGE    499
#else
# define TESTPCACHE_NPAGE    217
#endif
#define TESTPCACHE_RESERVE   17

/*
** Magic numbers used to determine validity of the page cache.
*/
#define TESTPCACHE_VALID  0x364585fd
#define TESTPCACHE_CLEAR  0xd42670d4

/*
** Private implementation of a page cache.
*/
typedef struct testpcache testpcache;
struct testpcache {
  int szPage;               /* Size of each page.  Multiple of 8. */
  int szExtra;              /* Size of extra data that accompanies each page */
  int bPurgeable;           /* True if the page cache is purgeable */
  int nFree;                /* Number of unused slots in a[] */
  int nPinned;              /* Number of pinned slots in a[] */
  unsigned iRand;           /* State of the PRNG */
  unsigned iMagic;          /* Magic number for sanity checking */
  struct testpcachePage {
    sqlite3_pcache_page page;  /* Base class */
    unsigned key;              /* The key for this page. 0 means unallocated */
    int isPinned;              /* True if the page is pinned */
  } a[TESTPCACHE_NPAGE];    /* All pages in the cache */
};

/*
** Get a random number using the PRNG in the given page cache.
*/
static unsigned testpcacheRandom(testpcache *p){
  unsigned x = 0;
  int i;
  for(i=0; i<4; i++){
    p->iRand = (p->iRand*69069 + 5);
    x = (x<<8) | ((p->iRand>>16)&0xff);
  }
  return x;
}


/*
** Allocate a new page cache instance.
*/
static sqlite3_pcache *testpcacheCreate(
  int szPage, 
  int szExtra, 
  int bPurgeable
){
  int nMem;
  char *x;
  testpcache *p;
  int i;
  assert( testpcacheGlobal.pDummy!=0 );
  szPage = (szPage+7)&~7;
  nMem = sizeof(testpcache) + TESTPCACHE_NPAGE*(szPage+szExtra);
  p = sqlite3_malloc( nMem );
  if( p==0 ) return 0;
  x = (char*)&p[1];
  p->szPage = szPage;
  p->szExtra = szExtra;
  p->nFree = TESTPCACHE_NPAGE;
  p->nPinned = 0;
  p->iRand = testpcacheGlobal.prngSeed;
  p->bPurgeable = bPurgeable;
  p->iMagic = TESTPCACHE_VALID;
  for(i=0; i<TESTPCACHE_NPAGE; i++, x += (szPage+szExtra)){
    p->a[i].key = 0;
    p->a[i].isPinned = 0;
    p->a[i].page.pBuf = (void*)x;
    p->a[i].page.pExtra = (void*)&x[szPage];
  }
  testpcacheGlobal.nInstance++;
  return (sqlite3_pcache*)p;
}

/*
** Set the cache size
*/
static void testpcacheCachesize(sqlite3_pcache *pCache, int newSize){
  testpcache *p = (testpcache*)pCache;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );
}

/*
** Return the number of pages in the cache that are being used.
** This includes both pinned and unpinned pages.
*/
static int testpcachePagecount(sqlite3_pcache *pCache){
  testpcache *p = (testpcache*)pCache;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );
  return TESTPCACHE_NPAGE - p->nFree;
}

/*
** Fetch a page.
*/
static sqlite3_pcache_page *testpcacheFetch(
  sqlite3_pcache *pCache,
  unsigned key,
  int createFlag
){
  testpcache *p = (testpcache*)pCache;
  int i, j;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );

  /* See if the page is already in cache.  Return immediately if it is */
  for(i=0; i<TESTPCACHE_NPAGE; i++){
    if( p->a[i].key==key ){
      if( !p->a[i].isPinned ){
        p->nPinned++;
        assert( p->nPinned <= TESTPCACHE_NPAGE - p->nFree );
        p->a[i].isPinned = 1;
      }
      return &p->a[i].page;
    }
  }

  /* If createFlag is 0, never allocate a new page */
  if( createFlag==0 ){
    return 0;
  }

  /* If no pages are available, always fail */
  if( p->nPinned==TESTPCACHE_NPAGE ){
    return 0;
  }

  /* Do not allocate the last TESTPCACHE_RESERVE pages unless createFlag is 2 */
  if( p->nPinned>=TESTPCACHE_NPAGE-TESTPCACHE_RESERVE && createFlag<2 ){
    return 0;
  }

  /* Do not allocate if highStress is enabled and createFlag is not 2.  
  **
  ** The highStress setting causes pagerStress() to be called much more
  ** often, which exercises the pager logic more intensely.
  */
  if( testpcacheGlobal.highStress && createFlag<2 ){
    return 0;
  }

  /* Find a free page to allocate if there are any free pages.
  ** Withhold TESTPCACHE_RESERVE free pages until createFlag is 2.
  */
  if( p->nFree>TESTPCACHE_RESERVE || (createFlag==2 && p->nFree>0) ){
    j = testpcacheRandom(p) % TESTPCACHE_NPAGE;
    for(i=0; i<TESTPCACHE_NPAGE; i++, j = (j+1)%TESTPCACHE_NPAGE){
      if( p->a[j].key==0 ){
        p->a[j].key = key;
        p->a[j].isPinned = 1;
        memset(p->a[j].page.pBuf, 0, p->szPage);
        memset(p->a[j].page.pExtra, 0, p->szExtra);
        p->nPinned++;
        p->nFree--;
        assert( p->nPinned <= TESTPCACHE_NPAGE - p->nFree );
        return &p->a[j].page;
      }
    }

    /* The prior loop always finds a freepage to allocate */
    assert( 0 );
  }

  /* If this cache is not purgeable then we have to fail.
  */
  if( p->bPurgeable==0 ){
    return 0;
  }

  /* If there are no free pages, recycle a page.  The page to
  ** recycle is selected at random from all unpinned pages.
  */
  j = testpcacheRandom(p) % TESTPCACHE_NPAGE;
  for(i=0; i<TESTPCACHE_NPAGE; i++, j = (j+1)%TESTPCACHE_NPAGE){
    if( p->a[j].key>0 && p->a[j].isPinned==0 ){
      p->a[j].key = key;
      p->a[j].isPinned = 1;
      memset(p->a[j].page.pBuf, 0, p->szPage);
      memset(p->a[j].page.pExtra, 0, p->szExtra);
      p->nPinned++;
      assert( p->nPinned <= TESTPCACHE_NPAGE - p->nFree );
      return &p->a[j].page;
    }
  }

  /* The previous loop always finds a page to recycle. */
  assert(0);
  return 0;
}

/*
** Unpin a page.
*/
static void testpcacheUnpin(
  sqlite3_pcache *pCache,
  sqlite3_pcache_page *pOldPage,
  int discard
){
  testpcache *p = (testpcache*)pCache;
  int i;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );

  /* Randomly discard pages as they are unpinned according to the
  ** discardChance setting.  If discardChance is 0, the random discard
  ** never happens.  If discardChance is 100, it always happens.
  */
  if( p->bPurgeable
  && (100-testpcacheGlobal.discardChance) <= (testpcacheRandom(p)%100)
  ){
    discard = 1;
  }

  for(i=0; i<TESTPCACHE_NPAGE; i++){
    if( &p->a[i].page==pOldPage ){
      /* The pOldPage pointer always points to a pinned page */
      assert( p->a[i].isPinned );
      p->a[i].isPinned = 0;
      p->nPinned--;
      assert( p->nPinned>=0 );
      if( discard ){
        p->a[i].key = 0;
        p->nFree++;
        assert( p->nFree<=TESTPCACHE_NPAGE );
      }
      return;
    }
  }

  /* The pOldPage pointer always points to a valid page */
  assert( 0 );
}


/*
** Rekey a single page.
*/
static void testpcacheRekey(
  sqlite3_pcache *pCache,
  sqlite3_pcache_page *pOldPage,
  unsigned oldKey,
  unsigned newKey
){
  testpcache *p = (testpcache*)pCache;
  int i;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );

  /* If there already exists another page at newKey, verify that
  ** the other page is unpinned and discard it.
  */
  for(i=0; i<TESTPCACHE_NPAGE; i++){
    if( p->a[i].key==newKey ){
      /* The new key is never a page that is already pinned */
      assert( p->a[i].isPinned==0 );
      p->a[i].key = 0;
      p->nFree++;
      assert( p->nFree<=TESTPCACHE_NPAGE );
      break;
    }
  }

  /* Find the page to be rekeyed and rekey it.
  */
  for(i=0; i<TESTPCACHE_NPAGE; i++){
    if( p->a[i].key==oldKey ){
      /* The oldKey and pOldPage parameters match */
      assert( &p->a[i].page==pOldPage );
      /* Page to be rekeyed must be pinned */
      assert( p->a[i].isPinned );
      p->a[i].key = newKey;
      return;
    }
  }

  /* Rekey is always given a valid page to work with */
  assert( 0 );
}


/*
** Truncate the page cache.  Every page with a key of iLimit or larger
** is discarded.
*/
static void testpcacheTruncate(sqlite3_pcache *pCache, unsigned iLimit){
  testpcache *p = (testpcache*)pCache;
  unsigned int i;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );
  for(i=0; i<TESTPCACHE_NPAGE; i++){
    if( p->a[i].key>=iLimit ){
      p->a[i].key = 0;
      if( p->a[i].isPinned ){
        p->nPinned--;
        assert( p->nPinned>=0 );
      }
      p->nFree++;
      assert( p->nFree<=TESTPCACHE_NPAGE );
    }
  }
}

/*
** Destroy a page cache.
*/
static void testpcacheDestroy(sqlite3_pcache *pCache){
  testpcache *p = (testpcache*)pCache;
  assert( p->iMagic==TESTPCACHE_VALID );
  assert( testpcacheGlobal.pDummy!=0 );
  assert( testpcacheGlobal.nInstance>0 );
  p->iMagic = TESTPCACHE_CLEAR;
  sqlite3_free(p);
  testpcacheGlobal.nInstance--;
}


/*
** Invoke this routine to register or unregister the testing pager cache
** implemented by this file.
**
** Install the test pager cache if installFlag is 1 and uninstall it if
** installFlag is 0.
**
** When installing, discardChance is a number between 0 and 100 that
** indicates the probability of discarding a page when unpinning the
** page.  0 means never discard (unless the discard flag is set).
** 100 means always discard.
*/
void installTestPCache(
  int installFlag,            /* True to install.  False to uninstall. */
  unsigned discardChance,     /* 0-100.  Chance to discard on unpin */
  unsigned prngSeed,          /* Seed for the PRNG */
  unsigned highStress         /* Call xStress agressively */
){
  static const sqlite3_pcache_methods2 testPcache = {
    1,
    (void*)&testpcacheGlobal,
    testpcacheInit,
    testpcacheShutdown,
    testpcacheCreate,
    testpcacheCachesize,
    testpcachePagecount,
    testpcacheFetch,
    testpcacheUnpin,
    testpcacheRekey,
    testpcacheTruncate,
    testpcacheDestroy,
  };
  static sqlite3_pcache_methods2 defaultPcache;
  static int isInstalled = 0;

  assert( testpcacheGlobal.nInstance==0 );
  assert( testpcacheGlobal.pDummy==0 );
  assert( discardChance<=100 );
  testpcacheGlobal.discardChance = discardChance;
  testpcacheGlobal.prngSeed = prngSeed ^ (prngSeed<<16);
  testpcacheGlobal.highStress = highStress;
  if( installFlag!=isInstalled ){
    if( installFlag ){
      sqlite3_config(SQLITE_CONFIG_GETPCACHE2, &defaultPcache);
      assert( defaultPcache.xCreate!=testpcacheCreate );
      sqlite3_config(SQLITE_CONFIG_PCACHE2, &testPcache);
    }else{
      assert( defaultPcache.xCreate!=0 );
      sqlite3_config(SQLITE_CONFIG_PCACHE2, &defaultPcache);
    }
    isInstalled = installFlag;
  }
}
