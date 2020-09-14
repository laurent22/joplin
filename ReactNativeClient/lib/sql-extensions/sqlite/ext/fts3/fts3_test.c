/*
** 2011 Jun 13
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
** This file is not part of the production FTS code. It is only used for
** testing. It contains a Tcl command that can be used to test if a document
** matches an FTS NEAR expression.
**
** As of March 2012, it also contains a version 1 tokenizer used for testing
** that the sqlite3_tokenizer_module.xLanguage() method is invoked correctly.
*/

#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#  ifndef SQLITE_TCLAPI
#    define SQLITE_TCLAPI
#  endif
#endif
#include <string.h>
#include <assert.h>

#if defined(SQLITE_TEST)
#if defined(SQLITE_ENABLE_FTS3) || defined(SQLITE_ENABLE_FTS4)

/* Required so that the "ifdef SQLITE_ENABLE_FTS3" below works */
#include "fts3Int.h"

#define NM_MAX_TOKEN 12

typedef struct NearPhrase NearPhrase;
typedef struct NearDocument NearDocument;
typedef struct NearToken NearToken;

struct NearDocument {
  int nToken;                     /* Length of token in bytes */
  NearToken *aToken;              /* Token array */
};

struct NearToken {
  int n;                          /* Length of token in bytes */
  const char *z;                  /* Pointer to token string */
};

struct NearPhrase {
  int nNear;                      /* Preceding NEAR value */
  int nToken;                     /* Number of tokens in this phrase */
  NearToken aToken[NM_MAX_TOKEN]; /* Array of tokens in this phrase */
};

static int nm_phrase_match(
  NearPhrase *p,
  NearToken *aToken
){
  int ii;

  for(ii=0; ii<p->nToken; ii++){
    NearToken *pToken = &p->aToken[ii];
    if( pToken->n>0 && pToken->z[pToken->n-1]=='*' ){
      if( aToken[ii].n<(pToken->n-1) ) return 0;
      if( memcmp(aToken[ii].z, pToken->z, pToken->n-1) ) return 0;
    }else{
      if( aToken[ii].n!=pToken->n ) return 0;
      if( memcmp(aToken[ii].z, pToken->z, pToken->n) ) return 0;
    }
  }

  return 1;
}

static int nm_near_chain(
  int iDir,                       /* Direction to iterate through aPhrase[] */
  NearDocument *pDoc,             /* Document to match against */
  int iPos,                       /* Position at which iPhrase was found */
  int nPhrase,                    /* Size of phrase array */
  NearPhrase *aPhrase,            /* Phrase array */
  int iPhrase                     /* Index of phrase found */
){
  int iStart;
  int iStop;
  int ii;
  int nNear;
  int iPhrase2;
  NearPhrase *p;
  NearPhrase *pPrev;

  assert( iDir==1 || iDir==-1 );

  if( iDir==1 ){
    if( (iPhrase+1)==nPhrase ) return 1;
    nNear = aPhrase[iPhrase+1].nNear;
  }else{
    if( iPhrase==0 ) return 1;
    nNear = aPhrase[iPhrase].nNear;
  }
  pPrev = &aPhrase[iPhrase];
  iPhrase2 = iPhrase+iDir;
  p = &aPhrase[iPhrase2];

  iStart = iPos - nNear - p->nToken;
  iStop = iPos + nNear + pPrev->nToken;

  if( iStart<0 ) iStart = 0;
  if( iStop > pDoc->nToken - p->nToken ) iStop = pDoc->nToken - p->nToken;

  for(ii=iStart; ii<=iStop; ii++){
    if( nm_phrase_match(p, &pDoc->aToken[ii]) ){
      if( nm_near_chain(iDir, pDoc, ii, nPhrase, aPhrase, iPhrase2) ) return 1;
    }
  }

  return 0;
}

static int nm_match_count(
  NearDocument *pDoc,             /* Document to match against */
  int nPhrase,                    /* Size of phrase array */
  NearPhrase *aPhrase,            /* Phrase array */
  int iPhrase                     /* Index of phrase to count matches for */
){
  int nOcc = 0;
  int ii;
  NearPhrase *p = &aPhrase[iPhrase];

  for(ii=0; ii<(pDoc->nToken + 1 - p->nToken); ii++){
    if( nm_phrase_match(p, &pDoc->aToken[ii]) ){
      /* Test forward NEAR chain (i>iPhrase) */
      if( 0==nm_near_chain(1, pDoc, ii, nPhrase, aPhrase, iPhrase) ) continue;

      /* Test reverse NEAR chain (i<iPhrase) */
      if( 0==nm_near_chain(-1, pDoc, ii, nPhrase, aPhrase, iPhrase) ) continue;

      /* This is a real match. Increment the counter. */
      nOcc++;
    }
  } 

  return nOcc;
}

/*
** Tclcmd: fts3_near_match DOCUMENT EXPR ?OPTIONS?
*/
static int SQLITE_TCLAPI fts3_near_match_cmd(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int nTotal = 0;
  int rc;
  int ii;
  int nPhrase;
  NearPhrase *aPhrase = 0;
  NearDocument doc = {0, 0};
  Tcl_Obj **apDocToken;
  Tcl_Obj *pRet;
  Tcl_Obj *pPhrasecount = 0;
  
  Tcl_Obj **apExprToken;
  int nExprToken;

  UNUSED_PARAMETER(clientData);

  /* Must have 3 or more arguments. */
  if( objc<3 || (objc%2)==0 ){
    Tcl_WrongNumArgs(interp, 1, objv, "DOCUMENT EXPR ?OPTION VALUE?...");
    rc = TCL_ERROR;
    goto near_match_out;
  }

  for(ii=3; ii<objc; ii+=2){
    enum NM_enum { NM_PHRASECOUNTS };
    struct TestnmSubcmd {
      char *zName;
      enum NM_enum eOpt;
    } aOpt[] = {
      { "-phrasecountvar", NM_PHRASECOUNTS },
      { 0, 0 }
    };
    int iOpt;
    if( Tcl_GetIndexFromObjStruct(
        interp, objv[ii], aOpt, sizeof(aOpt[0]), "option", 0, &iOpt) 
    ){
      return TCL_ERROR;
    }

    switch( aOpt[iOpt].eOpt ){
      case NM_PHRASECOUNTS:
        pPhrasecount = objv[ii+1];
        break;
    }
  }

  rc = Tcl_ListObjGetElements(interp, objv[1], &doc.nToken, &apDocToken);
  if( rc!=TCL_OK ) goto near_match_out;
  doc.aToken = (NearToken *)ckalloc(doc.nToken*sizeof(NearToken));
  for(ii=0; ii<doc.nToken; ii++){
    doc.aToken[ii].z = Tcl_GetStringFromObj(apDocToken[ii], &doc.aToken[ii].n);
  }

  rc = Tcl_ListObjGetElements(interp, objv[2], &nExprToken, &apExprToken);
  if( rc!=TCL_OK ) goto near_match_out;

  nPhrase = (nExprToken + 1) / 2;
  aPhrase = (NearPhrase *)ckalloc(nPhrase * sizeof(NearPhrase));
  memset(aPhrase, 0, nPhrase * sizeof(NearPhrase));
  for(ii=0; ii<nPhrase; ii++){
    Tcl_Obj *pPhrase = apExprToken[ii*2];
    Tcl_Obj **apToken;
    int nToken;
    int jj;

    rc = Tcl_ListObjGetElements(interp, pPhrase, &nToken, &apToken);
    if( rc!=TCL_OK ) goto near_match_out;
    if( nToken>NM_MAX_TOKEN ){
      Tcl_AppendResult(interp, "Too many tokens in phrase", 0);
      rc = TCL_ERROR;
      goto near_match_out;
    }
    for(jj=0; jj<nToken; jj++){
      NearToken *pT = &aPhrase[ii].aToken[jj];
      pT->z = Tcl_GetStringFromObj(apToken[jj], &pT->n);
    }
    aPhrase[ii].nToken = nToken;
  }
  for(ii=1; ii<nPhrase; ii++){
    Tcl_Obj *pNear = apExprToken[2*ii-1];
    int nNear;
    rc = Tcl_GetIntFromObj(interp, pNear, &nNear);
    if( rc!=TCL_OK ) goto near_match_out;
    aPhrase[ii].nNear = nNear;
  }

  pRet = Tcl_NewObj();
  Tcl_IncrRefCount(pRet);
  for(ii=0; ii<nPhrase; ii++){
    int nOcc = nm_match_count(&doc, nPhrase, aPhrase, ii);
    Tcl_ListObjAppendElement(interp, pRet, Tcl_NewIntObj(nOcc));
    nTotal += nOcc;
  }
  if( pPhrasecount ){
    Tcl_ObjSetVar2(interp, pPhrasecount, 0, pRet, 0);
  }
  Tcl_DecrRefCount(pRet);
  Tcl_SetObjResult(interp, Tcl_NewBooleanObj(nTotal>0));

 near_match_out: 
  ckfree((char *)aPhrase);
  ckfree((char *)doc.aToken);
  return rc;
}

/*
**   Tclcmd: fts3_configure_incr_load ?CHUNKSIZE THRESHOLD?
**
** Normally, FTS uses hard-coded values to determine the minimum doclist
** size eligible for incremental loading, and the size of the chunks loaded
** when a doclist is incrementally loaded. This command allows the built-in
** values to be overridden for testing purposes.
**
** If present, the first argument is the chunksize in bytes to load doclists
** in. The second argument is the minimum doclist size in bytes to use
** incremental loading with.
**
** Whether or not the arguments are present, this command returns a list of
** two integers - the initial chunksize and threshold when the command is
** invoked. This can be used to restore the default behavior after running
** tests. For example:
**
**    # Override incr-load settings for testing:
**    set cfg [fts3_configure_incr_load $new_chunksize $new_threshold]
**
**    .... run tests ....
**
**    # Restore initial incr-load settings:
**    eval fts3_configure_incr_load $cfg
*/
static int SQLITE_TCLAPI fts3_configure_incr_load_cmd(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
#ifdef SQLITE_ENABLE_FTS3
  extern int test_fts3_node_chunksize;
  extern int test_fts3_node_chunk_threshold;
  Tcl_Obj *pRet;

  if( objc!=1 && objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "?CHUNKSIZE THRESHOLD?");
    return TCL_ERROR;
  }

  pRet = Tcl_NewObj();
  Tcl_IncrRefCount(pRet);
  Tcl_ListObjAppendElement(
      interp, pRet, Tcl_NewIntObj(test_fts3_node_chunksize));
  Tcl_ListObjAppendElement(
      interp, pRet, Tcl_NewIntObj(test_fts3_node_chunk_threshold));

  if( objc==3 ){
    int iArg1;
    int iArg2;
    if( Tcl_GetIntFromObj(interp, objv[1], &iArg1)
     || Tcl_GetIntFromObj(interp, objv[2], &iArg2)
    ){
      Tcl_DecrRefCount(pRet);
      return TCL_ERROR;
    }
    test_fts3_node_chunksize = iArg1;
    test_fts3_node_chunk_threshold = iArg2;
  }

  Tcl_SetObjResult(interp, pRet);
  Tcl_DecrRefCount(pRet);
#endif
  UNUSED_PARAMETER(clientData);
  return TCL_OK;
}

#ifdef SQLITE_ENABLE_FTS3
/**************************************************************************
** Beginning of test tokenizer code.
**
** For language 0, this tokenizer is similar to the default 'simple' 
** tokenizer. For other languages L, the following:
**
**   * Odd numbered languages are case-sensitive. Even numbered 
**     languages are not.
**
**   * Language ids 100 or greater are considered an error.
**
** The implementation assumes that the input contains only ASCII characters
** (i.e. those that may be encoded in UTF-8 using a single byte).
*/
typedef struct test_tokenizer {
  sqlite3_tokenizer base;
} test_tokenizer;

typedef struct test_tokenizer_cursor {
  sqlite3_tokenizer_cursor base;
  const char *aInput;          /* Input being tokenized */
  int nInput;                  /* Size of the input in bytes */
  int iInput;                  /* Current offset in aInput */
  int iToken;                  /* Index of next token to be returned */
  char *aBuffer;               /* Buffer containing current token */
  int nBuffer;                 /* Number of bytes allocated at pToken */
  int iLangid;                 /* Configured language id */
} test_tokenizer_cursor;

static int testTokenizerCreate(
  int argc, const char * const *argv,
  sqlite3_tokenizer **ppTokenizer
){
  test_tokenizer *pNew;
  UNUSED_PARAMETER(argc);
  UNUSED_PARAMETER(argv);

  pNew = sqlite3_malloc(sizeof(test_tokenizer));
  if( !pNew ) return SQLITE_NOMEM;
  memset(pNew, 0, sizeof(test_tokenizer));

  *ppTokenizer = (sqlite3_tokenizer *)pNew;
  return SQLITE_OK;
}

static int testTokenizerDestroy(sqlite3_tokenizer *pTokenizer){
  test_tokenizer *p = (test_tokenizer *)pTokenizer;
  sqlite3_free(p);
  return SQLITE_OK;
}

static int testTokenizerOpen(
  sqlite3_tokenizer *pTokenizer,         /* The tokenizer */
  const char *pInput, int nBytes,        /* String to be tokenized */
  sqlite3_tokenizer_cursor **ppCursor    /* OUT: Tokenization cursor */
){
  int rc = SQLITE_OK;                    /* Return code */
  test_tokenizer_cursor *pCsr;           /* New cursor object */

  UNUSED_PARAMETER(pTokenizer);

  pCsr = (test_tokenizer_cursor *)sqlite3_malloc(sizeof(test_tokenizer_cursor));
  if( pCsr==0 ){
    rc = SQLITE_NOMEM;
  }else{
    memset(pCsr, 0, sizeof(test_tokenizer_cursor));
    pCsr->aInput = pInput;
    if( nBytes<0 ){
      pCsr->nInput = (int)strlen(pInput);
    }else{
      pCsr->nInput = nBytes;
    }
  }

  *ppCursor = (sqlite3_tokenizer_cursor *)pCsr;
  return rc;
}

static int testTokenizerClose(sqlite3_tokenizer_cursor *pCursor){
  test_tokenizer_cursor *pCsr = (test_tokenizer_cursor *)pCursor;
  sqlite3_free(pCsr->aBuffer);
  sqlite3_free(pCsr);
  return SQLITE_OK;
}

static int testIsTokenChar(char c){
  return (c>='a' && c<='z') || (c>='A' && c<='Z');
}
static int testTolower(char c){
  char ret = c;
  if( ret>='A' && ret<='Z') ret = ret - ('A'-'a');
  return ret;
}

static int testTokenizerNext(
  sqlite3_tokenizer_cursor *pCursor,  /* Cursor returned by testTokenizerOpen */
  const char **ppToken,               /* OUT: *ppToken is the token text */
  int *pnBytes,                       /* OUT: Number of bytes in token */
  int *piStartOffset,                 /* OUT: Starting offset of token */
  int *piEndOffset,                   /* OUT: Ending offset of token */
  int *piPosition                     /* OUT: Position integer of token */
){
  test_tokenizer_cursor *pCsr = (test_tokenizer_cursor *)pCursor;
  int rc = SQLITE_OK;
  const char *p;
  const char *pEnd;

  p = &pCsr->aInput[pCsr->iInput];
  pEnd = &pCsr->aInput[pCsr->nInput];

  /* Skip past any white-space */
  assert( p<=pEnd );
  while( p<pEnd && testIsTokenChar(*p)==0 ) p++;

  if( p==pEnd ){
    rc = SQLITE_DONE;
  }else{
    /* Advance to the end of the token */
    const char *pToken = p;
    sqlite3_int64 nToken;
    while( p<pEnd && testIsTokenChar(*p) ) p++;
    nToken = (sqlite3_int64)(p-pToken);

    /* Copy the token into the buffer */
    if( nToken>pCsr->nBuffer ){
      sqlite3_free(pCsr->aBuffer);
      pCsr->aBuffer = sqlite3_malloc64(nToken);
    }
    if( pCsr->aBuffer==0 ){
      rc = SQLITE_NOMEM;
    }else{
      int i;

      if( pCsr->iLangid & 0x00000001 ){
        for(i=0; i<nToken; i++) pCsr->aBuffer[i] = pToken[i];
      }else{
        for(i=0; i<nToken; i++) pCsr->aBuffer[i] = (char)testTolower(pToken[i]);
      }
      pCsr->iToken++;
      pCsr->iInput = (int)(p - pCsr->aInput);

      *ppToken = pCsr->aBuffer;
      *pnBytes = (int)nToken;
      *piStartOffset = (int)(pToken - pCsr->aInput);
      *piEndOffset = (int)(p - pCsr->aInput);
      *piPosition = pCsr->iToken;
    }
  }

  return rc;
}

static int testTokenizerLanguage(
  sqlite3_tokenizer_cursor *pCursor,
  int iLangid
){
  int rc = SQLITE_OK;
  test_tokenizer_cursor *pCsr = (test_tokenizer_cursor *)pCursor;
  pCsr->iLangid = iLangid;
  if( pCsr->iLangid>=100 ){
    rc = SQLITE_ERROR;
  }
  return rc;
}
#endif

static int SQLITE_TCLAPI fts3_test_tokenizer_cmd(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
#ifdef SQLITE_ENABLE_FTS3
  static const sqlite3_tokenizer_module testTokenizerModule = {
    1,
    testTokenizerCreate,
    testTokenizerDestroy,
    testTokenizerOpen,
    testTokenizerClose,
    testTokenizerNext,
    testTokenizerLanguage
  };
  const sqlite3_tokenizer_module *pPtr = &testTokenizerModule;
  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }
  Tcl_SetObjResult(interp, Tcl_NewByteArrayObj(
    (const unsigned char *)&pPtr, sizeof(sqlite3_tokenizer_module *)
  ));
#endif
  UNUSED_PARAMETER(clientData);
  return TCL_OK;
}

static int SQLITE_TCLAPI fts3_test_varint_cmd(
  ClientData clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
#ifdef SQLITE_ENABLE_FTS3
  char aBuf[24];
  int rc;
  Tcl_WideInt w;
  sqlite3_int64 w2;
  int nByte, nByte2;

  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "INTEGER");
    return TCL_ERROR;
  }

  rc = Tcl_GetWideIntFromObj(interp, objv[1], &w);
  if( rc!=TCL_OK ) return rc;

  nByte = sqlite3Fts3PutVarint(aBuf, w);
  nByte2 = sqlite3Fts3GetVarint(aBuf, &w2);
  if( w!=w2 || nByte!=nByte2 ){
    char *zErr = sqlite3_mprintf("error testing %lld", w);
    Tcl_ResetResult(interp);
    Tcl_AppendResult(interp, zErr, 0);
    return TCL_ERROR;
  }

  if( w<=2147483647 && w>=0 ){
    int i;
    nByte2 = fts3GetVarint32(aBuf, &i);
    if( (int)w!=i || nByte!=nByte2 ){
      char *zErr = sqlite3_mprintf("error testing %lld (32-bit)", w);
      Tcl_ResetResult(interp);
      Tcl_AppendResult(interp, zErr, 0);
      return TCL_ERROR;
    }
  }

#endif
  UNUSED_PARAMETER(clientData);
  return TCL_OK;
}

/* 
** End of tokenizer code.
**************************************************************************/ 

/*
**      sqlite3_fts3_may_be_corrupt BOOLEAN
**
** Set or clear the global "may-be-corrupt" flag. Return the old value.
*/
static int SQLITE_TCLAPI fts3_may_be_corrupt(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int bOld = sqlite3_fts3_may_be_corrupt;

  if( objc!=2 && objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "?BOOLEAN?");
    return TCL_ERROR;
  }
  if( objc==2 ){
    int bNew;
    if( Tcl_GetBooleanFromObj(interp, objv[1], &bNew) ) return TCL_ERROR;
    sqlite3_fts3_may_be_corrupt = bNew;
  }

  Tcl_SetObjResult(interp, Tcl_NewIntObj(bOld));
  return TCL_OK;
}

int Sqlitetestfts3_Init(Tcl_Interp *interp){
  Tcl_CreateObjCommand(interp, "fts3_near_match", fts3_near_match_cmd, 0, 0);
  Tcl_CreateObjCommand(interp, 
      "fts3_configure_incr_load", fts3_configure_incr_load_cmd, 0, 0
  );
  Tcl_CreateObjCommand(
      interp, "fts3_test_tokenizer", fts3_test_tokenizer_cmd, 0, 0
  );
  Tcl_CreateObjCommand(
      interp, "fts3_test_varint", fts3_test_varint_cmd, 0, 0
  );
  Tcl_CreateObjCommand(
      interp, "sqlite3_fts3_may_be_corrupt", fts3_may_be_corrupt, 0, 0
  );
  return TCL_OK;
}
#endif                  /* SQLITE_ENABLE_FTS3 || SQLITE_ENABLE_FTS4 */
#endif                  /* ifdef SQLITE_TEST */
