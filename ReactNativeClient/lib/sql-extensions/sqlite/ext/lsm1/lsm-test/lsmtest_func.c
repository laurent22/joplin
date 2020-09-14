
#include "lsmtest.h"


int do_work(int nArg, char **azArg){
  struct Option {
    const char *zName;
  } aOpt [] = {
    { "-nmerge" },
    { "-nkb" },
    { 0 }
  };

  lsm_db *pDb;
  int rc;
  int i;
  const char *zDb;
  int nMerge = 1;
  int nKB = (1<<30);

  if( nArg==0 ) goto usage;
  zDb = azArg[nArg-1];
  for(i=0; i<(nArg-1); i++){
    int iSel;
    rc = testArgSelect(aOpt, "option", azArg[i], &iSel);
    if( rc ) return rc;
    switch( iSel ){
      case 0:
        i++;
        if( i==(nArg-1) ) goto usage;
        nMerge = atoi(azArg[i]);
        break;
      case 1:
        i++;
        if( i==(nArg-1) ) goto usage;
        nKB = atoi(azArg[i]);
        break;
    }
  }

  rc = lsm_new(0, &pDb);
  if( rc!=LSM_OK ){
    testPrintError("lsm_open(): rc=%d\n", rc);
  }else{
    rc = lsm_open(pDb, zDb);
    if( rc!=LSM_OK ){
      testPrintError("lsm_open(): rc=%d\n", rc);
    }else{
      int n = -1;
      lsm_config(pDb, LSM_CONFIG_BLOCK_SIZE, &n);
      n = n*2;
      lsm_config(pDb, LSM_CONFIG_AUTOCHECKPOINT, &n);

      rc = lsm_work(pDb, nMerge, nKB, 0);
      if( rc!=LSM_OK ){
        testPrintError("lsm_work(): rc=%d\n", rc);
      }
    }
  }
  if( rc==LSM_OK ){
    rc = lsm_checkpoint(pDb, 0);
  }

  lsm_close(pDb);
  return rc;

 usage:
  testPrintUsage("?-optimize? ?-n N? DATABASE");
  return -1;
}


/*
**   lsmtest show ?-config LSM-CONFIG? DATABASE ?COMMAND ?PGNO??
*/
int do_show(int nArg, char **azArg){
  lsm_db *pDb;
  int rc;
  const char *zDb;

  int eOpt = LSM_INFO_DB_STRUCTURE;
  unsigned int iPg = 0;
  int bConfig = 0;
  const char *zConfig = "";

  struct Option {
    const char *zName;
    int bConfig;
    int eOpt;
  } aOpt [] = { 
    { "array",       0, LSM_INFO_ARRAY_STRUCTURE },
    { "array-pages", 0, LSM_INFO_ARRAY_PAGES },
    { "blocksize",   1, LSM_CONFIG_BLOCK_SIZE },
    { "pagesize",    1, LSM_CONFIG_PAGE_SIZE },
    { "freelist",    0, LSM_INFO_FREELIST },
    { "page-ascii",  0, LSM_INFO_PAGE_ASCII_DUMP },
    { "page-hex",    0, LSM_INFO_PAGE_HEX_DUMP },
    { 0, 0 } 
  };

  char *z = 0; 
  int iDb = 0;                    /* Index of DATABASE in azArg[] */

  /* Check if there is a "-config" option: */
  if( nArg>2 && strlen(azArg[0])>1 
   && memcmp(azArg[0], "-config", strlen(azArg[0]))==0
  ){
    zConfig = azArg[1];
    iDb = 2;
  }
  if( nArg<(iDb+1) ) goto usage;

  if( nArg>(iDb+1) ){
    rc = testArgSelect(aOpt, "option", azArg[iDb+1], &eOpt);
    if( rc!=0 ) return rc;
    bConfig = aOpt[eOpt].bConfig;
    eOpt = aOpt[eOpt].eOpt;
    if( (bConfig==0 && eOpt==LSM_INFO_FREELIST)
     || (bConfig==1 && eOpt==LSM_CONFIG_BLOCK_SIZE)
     || (bConfig==1 && eOpt==LSM_CONFIG_PAGE_SIZE)
    ){
      if( nArg!=(iDb+2) ) goto usage;
    }else{
      if( nArg!=(iDb+3) ) goto usage;
      iPg = atoi(azArg[iDb+2]);
    }
  }
  zDb = azArg[iDb];

  rc = lsm_new(0, &pDb);
  tdb_lsm_configure(pDb, zConfig);
  if( rc!=LSM_OK ){
    testPrintError("lsm_new(): rc=%d\n", rc);
  }else{
    rc = lsm_open(pDb, zDb);
    if( rc!=LSM_OK ){
      testPrintError("lsm_open(): rc=%d\n", rc);
    }
  }

  if( rc==LSM_OK ){
    if( bConfig==0 ){
      switch( eOpt ){
        case LSM_INFO_DB_STRUCTURE:
        case LSM_INFO_FREELIST:
          rc = lsm_info(pDb, eOpt, &z);
          break;
        case LSM_INFO_ARRAY_STRUCTURE:
        case LSM_INFO_ARRAY_PAGES:
        case LSM_INFO_PAGE_ASCII_DUMP:
        case LSM_INFO_PAGE_HEX_DUMP:
          rc = lsm_info(pDb, eOpt, iPg, &z);
          break;
        default:
          assert( !"no chance" );
      }

      if( rc==LSM_OK ){
        printf("%s\n", z ? z : "");
        fflush(stdout);
      }
      lsm_free(lsm_get_env(pDb), z);
    }else{
      int iRes = -1;
      lsm_config(pDb, eOpt, &iRes);
      printf("%d\n", iRes);
      fflush(stdout);
    }
  }

  lsm_close(pDb);
  return rc;

 usage:
  testPrintUsage("DATABASE ?array|page-ascii|page-hex PGNO?");
  return -1;
}
