/*
** 2018-04-12
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains code to implement various aspects of UPSERT
** processing and handling of the Upsert object.
*/
#include "sqliteInt.h"

#ifndef SQLITE_OMIT_UPSERT
/*
** Free a list of Upsert objects
*/
void sqlite3UpsertDelete(sqlite3 *db, Upsert *p){
  if( p ){
    sqlite3ExprListDelete(db, p->pUpsertTarget);
    sqlite3ExprDelete(db, p->pUpsertTargetWhere);
    sqlite3ExprListDelete(db, p->pUpsertSet);
    sqlite3ExprDelete(db, p->pUpsertWhere);
    sqlite3DbFree(db, p);
  }
}

/*
** Duplicate an Upsert object.
*/
Upsert *sqlite3UpsertDup(sqlite3 *db, Upsert *p){
  if( p==0 ) return 0;
  return sqlite3UpsertNew(db,
           sqlite3ExprListDup(db, p->pUpsertTarget, 0),
           sqlite3ExprDup(db, p->pUpsertTargetWhere, 0),
           sqlite3ExprListDup(db, p->pUpsertSet, 0),
           sqlite3ExprDup(db, p->pUpsertWhere, 0)
         );
}

/*
** Create a new Upsert object.
*/
Upsert *sqlite3UpsertNew(
  sqlite3 *db,           /* Determines which memory allocator to use */
  ExprList *pTarget,     /* Target argument to ON CONFLICT, or NULL */
  Expr *pTargetWhere,    /* Optional WHERE clause on the target */
  ExprList *pSet,        /* UPDATE columns, or NULL for a DO NOTHING */
  Expr *pWhere           /* WHERE clause for the ON CONFLICT UPDATE */
){
  Upsert *pNew;
  pNew = sqlite3DbMallocRaw(db, sizeof(Upsert));
  if( pNew==0 ){
    sqlite3ExprListDelete(db, pTarget);
    sqlite3ExprDelete(db, pTargetWhere);
    sqlite3ExprListDelete(db, pSet);
    sqlite3ExprDelete(db, pWhere);
    return 0;
  }else{
    pNew->pUpsertTarget = pTarget;
    pNew->pUpsertTargetWhere = pTargetWhere;
    pNew->pUpsertSet = pSet;
    pNew->pUpsertWhere = pWhere;
    pNew->pUpsertIdx = 0;
  }
  return pNew;
}

/*
** Analyze the ON CONFLICT clause described by pUpsert.  Resolve all
** symbols in the conflict-target.
**
** Return SQLITE_OK if everything works, or an error code is something
** is wrong.
*/
int sqlite3UpsertAnalyzeTarget(
  Parse *pParse,     /* The parsing context */
  SrcList *pTabList, /* Table into which we are inserting */
  Upsert *pUpsert    /* The ON CONFLICT clauses */
){
  Table *pTab;            /* That table into which we are inserting */
  int rc;                 /* Result code */
  int iCursor;            /* Cursor used by pTab */
  Index *pIdx;            /* One of the indexes of pTab */
  ExprList *pTarget;      /* The conflict-target clause */
  Expr *pTerm;            /* One term of the conflict-target clause */
  NameContext sNC;        /* Context for resolving symbolic names */
  Expr sCol[2];           /* Index column converted into an Expr */

  assert( pTabList->nSrc==1 );
  assert( pTabList->a[0].pTab!=0 );
  assert( pUpsert!=0 );
  assert( pUpsert->pUpsertTarget!=0 );

  /* Resolve all symbolic names in the conflict-target clause, which
  ** includes both the list of columns and the optional partial-index
  ** WHERE clause.
  */
  memset(&sNC, 0, sizeof(sNC));
  sNC.pParse = pParse;
  sNC.pSrcList = pTabList;
  rc = sqlite3ResolveExprListNames(&sNC, pUpsert->pUpsertTarget);
  if( rc ) return rc;
  rc = sqlite3ResolveExprNames(&sNC, pUpsert->pUpsertTargetWhere);
  if( rc ) return rc;

  /* Check to see if the conflict target matches the rowid. */  
  pTab = pTabList->a[0].pTab;
  pTarget = pUpsert->pUpsertTarget;
  iCursor = pTabList->a[0].iCursor;
  if( HasRowid(pTab) 
   && pTarget->nExpr==1
   && (pTerm = pTarget->a[0].pExpr)->op==TK_COLUMN
   && pTerm->iColumn==XN_ROWID
  ){
    /* The conflict-target is the rowid of the primary table */
    assert( pUpsert->pUpsertIdx==0 );
    return SQLITE_OK;
  }

  /* Initialize sCol[0..1] to be an expression parse tree for a
  ** single column of an index.  The sCol[0] node will be the TK_COLLATE
  ** operator and sCol[1] will be the TK_COLUMN operator.  Code below
  ** will populate the specific collation and column number values
  ** prior to comparing against the conflict-target expression.
  */
  memset(sCol, 0, sizeof(sCol));
  sCol[0].op = TK_COLLATE;
  sCol[0].pLeft = &sCol[1];
  sCol[1].op = TK_COLUMN;
  sCol[1].iTable = pTabList->a[0].iCursor;

  /* Check for matches against other indexes */
  for(pIdx=pTab->pIndex; pIdx; pIdx=pIdx->pNext){
    int ii, jj, nn;
    if( !IsUniqueIndex(pIdx) ) continue;
    if( pTarget->nExpr!=pIdx->nKeyCol ) continue;
    if( pIdx->pPartIdxWhere ){
      if( pUpsert->pUpsertTargetWhere==0 ) continue;
      if( sqlite3ExprCompare(pParse, pUpsert->pUpsertTargetWhere,
                             pIdx->pPartIdxWhere, iCursor)!=0 ){
        continue;
      }
    }
    nn = pIdx->nKeyCol;
    for(ii=0; ii<nn; ii++){
      Expr *pExpr;
      sCol[0].u.zToken = (char*)pIdx->azColl[ii];
      if( pIdx->aiColumn[ii]==XN_EXPR ){
        assert( pIdx->aColExpr!=0 );
        assert( pIdx->aColExpr->nExpr>ii );
        pExpr = pIdx->aColExpr->a[ii].pExpr;
        if( pExpr->op!=TK_COLLATE ){
          sCol[0].pLeft = pExpr;
          pExpr = &sCol[0];
        }
      }else{
        sCol[0].pLeft = &sCol[1];
        sCol[1].iColumn = pIdx->aiColumn[ii];
        pExpr = &sCol[0];
      }
      for(jj=0; jj<nn; jj++){
        if( sqlite3ExprCompare(pParse, pTarget->a[jj].pExpr, pExpr,iCursor)<2 ){
          break;  /* Column ii of the index matches column jj of target */
        }
      }
      if( jj>=nn ){
        /* The target contains no match for column jj of the index */
        break;
      }
    }
    if( ii<nn ){
      /* Column ii of the index did not match any term of the conflict target.
      ** Continue the search with the next index. */
      continue;
    }
    pUpsert->pUpsertIdx = pIdx;
    return SQLITE_OK;
  }
  sqlite3ErrorMsg(pParse, "ON CONFLICT clause does not match any "
                          "PRIMARY KEY or UNIQUE constraint");
  return SQLITE_ERROR;
}

/*
** Generate bytecode that does an UPDATE as part of an upsert.
**
** If pIdx is NULL, then the UNIQUE constraint that failed was the IPK.
** In this case parameter iCur is a cursor open on the table b-tree that
** currently points to the conflicting table row. Otherwise, if pIdx
** is not NULL, then pIdx is the constraint that failed and iCur is a
** cursor points to the conflicting row.
*/
void sqlite3UpsertDoUpdate(
  Parse *pParse,        /* The parsing and code-generating context */
  Upsert *pUpsert,      /* The ON CONFLICT clause for the upsert */
  Table *pTab,          /* The table being updated */
  Index *pIdx,          /* The UNIQUE constraint that failed */
  int iCur              /* Cursor for pIdx (or pTab if pIdx==NULL) */
){
  Vdbe *v = pParse->pVdbe;
  sqlite3 *db = pParse->db;
  SrcList *pSrc;            /* FROM clause for the UPDATE */
  int iDataCur;
  int i;

  assert( v!=0 );
  assert( pUpsert!=0 );
  VdbeNoopComment((v, "Begin DO UPDATE of UPSERT"));
  iDataCur = pUpsert->iDataCur;
  if( pIdx && iCur!=iDataCur ){
    if( HasRowid(pTab) ){
      int regRowid = sqlite3GetTempReg(pParse);
      sqlite3VdbeAddOp2(v, OP_IdxRowid, iCur, regRowid);
      sqlite3VdbeAddOp3(v, OP_SeekRowid, iDataCur, 0, regRowid);
      VdbeCoverage(v);
      sqlite3ReleaseTempReg(pParse, regRowid);
    }else{
      Index *pPk = sqlite3PrimaryKeyIndex(pTab);
      int nPk = pPk->nKeyCol;
      int iPk = pParse->nMem+1;
      pParse->nMem += nPk;
      for(i=0; i<nPk; i++){
        int k;
        assert( pPk->aiColumn[i]>=0 );
        k = sqlite3TableColumnToIndex(pIdx, pPk->aiColumn[i]);
        sqlite3VdbeAddOp3(v, OP_Column, iCur, k, iPk+i);
        VdbeComment((v, "%s.%s", pIdx->zName,
                    pTab->aCol[pPk->aiColumn[i]].zName));
      }
      sqlite3VdbeVerifyAbortable(v, OE_Abort);
      i = sqlite3VdbeAddOp4Int(v, OP_Found, iDataCur, 0, iPk, nPk);
      VdbeCoverage(v);
      sqlite3VdbeAddOp4(v, OP_Halt, SQLITE_CORRUPT, OE_Abort, 0, 
            "corrupt database", P4_STATIC);
      sqlite3MayAbort(pParse);
      sqlite3VdbeJumpHere(v, i);
    }
  }
  /* pUpsert does not own pUpsertSrc - the outer INSERT statement does.  So
  ** we have to make a copy before passing it down into sqlite3Update() */
  pSrc = sqlite3SrcListDup(db, pUpsert->pUpsertSrc, 0);
  /* excluded.* columns of type REAL need to be converted to a hard real */
  for(i=0; i<pTab->nCol; i++){
    if( pTab->aCol[i].affinity==SQLITE_AFF_REAL ){
      sqlite3VdbeAddOp1(v, OP_RealAffinity, pUpsert->regData+i);
    }
  }
  sqlite3Update(pParse, pSrc, pUpsert->pUpsertSet,
      pUpsert->pUpsertWhere, OE_Abort, 0, 0, pUpsert);
  pUpsert->pUpsertSet = 0;    /* Will have been deleted by sqlite3Update() */
  pUpsert->pUpsertWhere = 0;  /* Will have been deleted by sqlite3Update() */
  VdbeNoopComment((v, "End DO UPDATE of UPSERT"));
}

#endif /* SQLITE_OMIT_UPSERT */
