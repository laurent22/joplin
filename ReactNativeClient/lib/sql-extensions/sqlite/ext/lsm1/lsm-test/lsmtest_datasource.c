

#include "lsmtest.h"

struct Datasource {
  int eType;

  int nMinKey;
  int nMaxKey;
  int nMinVal;
  int nMaxVal;

  char *aKey;
  char *aVal;
};

void testDatasourceEntry(
  Datasource *p, 
  int iData, 
  void **ppKey, int *pnKey,
  void **ppVal, int *pnVal
){
  assert( (ppKey==0)==(pnKey==0) );
  assert( (ppVal==0)==(pnVal==0) );

  if( ppKey ){
    int nKey = 0;
    switch( p->eType ){
      case TEST_DATASOURCE_RANDOM: {
        int nRange = (1 + p->nMaxKey - p->nMinKey);
        nKey = (int)( testPrngValue((u32)iData) % nRange ) + p->nMinKey; 
        testPrngString((u32)iData, p->aKey, nKey);
        break;
      }
      case TEST_DATASOURCE_SEQUENCE:
        nKey = sprintf(p->aKey, "%012d", iData);
        break;
    }
    *ppKey = p->aKey;
    *pnKey = nKey;
  }
  if( ppVal ){
    u32 nVal = testPrngValue((u32)iData)%(1+p->nMaxVal-p->nMinVal)+p->nMinVal;
    testPrngString((u32)~iData, p->aVal, (int)nVal);
    *ppVal = p->aVal;
    *pnVal = (int)nVal;
  }
}

void testDatasourceFree(Datasource *p){
  testFree(p);
}

/*
** Return a pointer to a nul-terminated string that corresponds to the
** contents of the datasource-definition passed as the first argument.
** The caller should eventually free the returned pointer using testFree().
*/
char *testDatasourceName(const DatasourceDefn *p){
  char *zRet;
  zRet = testMallocPrintf("%s.(%d-%d).(%d-%d)",
      (p->eType==TEST_DATASOURCE_SEQUENCE ? "seq" : "rnd"),
      p->nMinKey, p->nMaxKey,
      p->nMinVal, p->nMaxVal
  );
  return zRet;
}

Datasource *testDatasourceNew(const DatasourceDefn *pDefn){
  Datasource *p;
  int nMinKey; 
  int nMaxKey;
  int nMinVal;
  int nMaxVal; 

  if( pDefn->eType==TEST_DATASOURCE_SEQUENCE ){
    nMinKey = 128;
    nMaxKey = 128;
  }else{
    nMinKey = MAX(0, pDefn->nMinKey);
    nMaxKey = MAX(nMinKey, pDefn->nMaxKey);
  }
  nMinVal = MAX(0, pDefn->nMinVal);
  nMaxVal = MAX(nMinVal, pDefn->nMaxVal);

  p = (Datasource *)testMalloc(sizeof(Datasource) + nMaxKey + nMaxVal + 1);
  p->eType = pDefn->eType;
  p->nMinKey = nMinKey;
  p->nMinVal = nMinVal;
  p->nMaxKey = nMaxKey;
  p->nMaxVal = nMaxVal;
  
  p->aKey = (char *)&p[1];
  p->aVal = &p->aKey[nMaxKey];
  return p;
};
