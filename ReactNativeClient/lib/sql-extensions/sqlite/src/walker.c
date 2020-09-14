/*
** 2008 August 16
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains routines used for walking the parser tree for
** an SQL statement.
*/
#include "sqliteInt.h"
#include <stdlib.h>
#include <string.h>


#if !defined(SQLITE_OMIT_WINDOWFUNC)
/*
** Walk all expressions linked into the list of Window objects passed
** as the second argument.
*/
static int walkWindowList(Walker *pWalker, Window *pList){
  Window *pWin;
  for(pWin=pList; pWin; pWin=pWin->pNextWin){
    int rc;
    rc = sqlite3WalkExprList(pWalker, pWin->pOrderBy);
    if( rc ) return WRC_Abort;
    rc = sqlite3WalkExprList(pWalker, pWin->pPartition);
    if( rc ) return WRC_Abort;
    rc = sqlite3WalkExpr(pWalker, pWin->pFilter);
    if( rc ) return WRC_Abort;

    /* The next two are purely for calls to sqlite3RenameExprUnmap()
    ** within sqlite3WindowOffsetExpr().  Because of constraints imposed
    ** by sqlite3WindowOffsetExpr(), they can never fail.  The results do
    ** not matter anyhow. */
    rc = sqlite3WalkExpr(pWalker, pWin->pStart);
    if( NEVER(rc) ) return WRC_Abort;
    rc = sqlite3WalkExpr(pWalker, pWin->pEnd);
    if( NEVER(rc) ) return WRC_Abort;
  }
  return WRC_Continue;
}
#endif

/*
** Walk an expression tree.  Invoke the callback once for each node
** of the expression, while descending.  (In other words, the callback
** is invoked before visiting children.)
**
** The return value from the callback should be one of the WRC_*
** constants to specify how to proceed with the walk.
**
**    WRC_Continue      Continue descending down the tree.
**
**    WRC_Prune         Do not descend into child nodes, but allow
**                      the walk to continue with sibling nodes.
**
**    WRC_Abort         Do no more callbacks.  Unwind the stack and
**                      return from the top-level walk call.
**
** The return value from this routine is WRC_Abort to abandon the tree walk
** and WRC_Continue to continue.
*/
static SQLITE_NOINLINE int walkExpr(Walker *pWalker, Expr *pExpr){
  int rc;
  testcase( ExprHasProperty(pExpr, EP_TokenOnly) );
  testcase( ExprHasProperty(pExpr, EP_Reduced) );
  while(1){
    rc = pWalker->xExprCallback(pWalker, pExpr);
    if( rc ) return rc & WRC_Abort;
    if( !ExprHasProperty(pExpr,(EP_TokenOnly|EP_Leaf)) ){
      assert( pExpr->x.pList==0 || pExpr->pRight==0 );
      if( pExpr->pLeft && walkExpr(pWalker, pExpr->pLeft) ) return WRC_Abort;
      if( pExpr->pRight ){
        assert( !ExprHasProperty(pExpr, EP_WinFunc) );
        pExpr = pExpr->pRight;
        continue;
      }else if( ExprHasProperty(pExpr, EP_xIsSelect) ){
        assert( !ExprHasProperty(pExpr, EP_WinFunc) );
        if( sqlite3WalkSelect(pWalker, pExpr->x.pSelect) ) return WRC_Abort;
      }else{
        if( pExpr->x.pList ){
          if( sqlite3WalkExprList(pWalker, pExpr->x.pList) ) return WRC_Abort;
        }
#ifndef SQLITE_OMIT_WINDOWFUNC
        if( ExprHasProperty(pExpr, EP_WinFunc) ){
          if( walkWindowList(pWalker, pExpr->y.pWin) ) return WRC_Abort;
        }
#endif
      }
    }
    break;
  }
  return WRC_Continue;
}
int sqlite3WalkExpr(Walker *pWalker, Expr *pExpr){
  return pExpr ? walkExpr(pWalker,pExpr) : WRC_Continue;
}

/*
** Call sqlite3WalkExpr() for every expression in list p or until
** an abort request is seen.
*/
int sqlite3WalkExprList(Walker *pWalker, ExprList *p){
  int i;
  struct ExprList_item *pItem;
  if( p ){
    for(i=p->nExpr, pItem=p->a; i>0; i--, pItem++){
      if( sqlite3WalkExpr(pWalker, pItem->pExpr) ) return WRC_Abort;
    }
  }
  return WRC_Continue;
}

/*
** Walk all expressions associated with SELECT statement p.  Do
** not invoke the SELECT callback on p, but do (of course) invoke
** any expr callbacks and SELECT callbacks that come from subqueries.
** Return WRC_Abort or WRC_Continue.
*/
int sqlite3WalkSelectExpr(Walker *pWalker, Select *p){
  if( sqlite3WalkExprList(pWalker, p->pEList) ) return WRC_Abort;
  if( sqlite3WalkExpr(pWalker, p->pWhere) ) return WRC_Abort;
  if( sqlite3WalkExprList(pWalker, p->pGroupBy) ) return WRC_Abort;
  if( sqlite3WalkExpr(pWalker, p->pHaving) ) return WRC_Abort;
  if( sqlite3WalkExprList(pWalker, p->pOrderBy) ) return WRC_Abort;
  if( sqlite3WalkExpr(pWalker, p->pLimit) ) return WRC_Abort;
#if !defined(SQLITE_OMIT_WINDOWFUNC) && !defined(SQLITE_OMIT_ALTERTABLE)
  {
    Parse *pParse = pWalker->pParse;
    if( pParse && IN_RENAME_OBJECT ){
      /* The following may return WRC_Abort if there are unresolvable
      ** symbols (e.g. a table that does not exist) in a window definition. */
      int rc = walkWindowList(pWalker, p->pWinDefn);
      return rc;
    }
  }
#endif
  return WRC_Continue;
}

/*
** Walk the parse trees associated with all subqueries in the
** FROM clause of SELECT statement p.  Do not invoke the select
** callback on p, but do invoke it on each FROM clause subquery
** and on any subqueries further down in the tree.  Return 
** WRC_Abort or WRC_Continue;
*/
int sqlite3WalkSelectFrom(Walker *pWalker, Select *p){
  SrcList *pSrc;
  int i;
  struct SrcList_item *pItem;

  pSrc = p->pSrc;
  if( pSrc ){
    for(i=pSrc->nSrc, pItem=pSrc->a; i>0; i--, pItem++){
      if( pItem->pSelect && sqlite3WalkSelect(pWalker, pItem->pSelect) ){
        return WRC_Abort;
      }
      if( pItem->fg.isTabFunc
       && sqlite3WalkExprList(pWalker, pItem->u1.pFuncArg)
      ){
        return WRC_Abort;
      }
    }
  }
  return WRC_Continue;
} 

/*
** Call sqlite3WalkExpr() for every expression in Select statement p.
** Invoke sqlite3WalkSelect() for subqueries in the FROM clause and
** on the compound select chain, p->pPrior. 
**
** If it is not NULL, the xSelectCallback() callback is invoked before
** the walk of the expressions and FROM clause. The xSelectCallback2()
** method is invoked following the walk of the expressions and FROM clause,
** but only if both xSelectCallback and xSelectCallback2 are both non-NULL
** and if the expressions and FROM clause both return WRC_Continue;
**
** Return WRC_Continue under normal conditions.  Return WRC_Abort if
** there is an abort request.
**
** If the Walker does not have an xSelectCallback() then this routine
** is a no-op returning WRC_Continue.
*/
int sqlite3WalkSelect(Walker *pWalker, Select *p){
  int rc;
  if( p==0 ) return WRC_Continue;
  if( pWalker->xSelectCallback==0 ) return WRC_Continue;
  do{
    rc = pWalker->xSelectCallback(pWalker, p);
    if( rc ) return rc & WRC_Abort;
    if( sqlite3WalkSelectExpr(pWalker, p)
     || sqlite3WalkSelectFrom(pWalker, p)
    ){
      return WRC_Abort;
    }
    if( pWalker->xSelectCallback2 ){
      pWalker->xSelectCallback2(pWalker, p);
    }
    p = p->pPrior;
  }while( p!=0 );
  return WRC_Continue;
}

/* Increase the walkerDepth when entering a subquery, and
** descrease when leaving the subquery.
*/
int sqlite3WalkerDepthIncrease(Walker *pWalker, Select *pSelect){
  UNUSED_PARAMETER(pSelect);
  pWalker->walkerDepth++;
  return WRC_Continue;
}
void sqlite3WalkerDepthDecrease(Walker *pWalker, Select *pSelect){
  UNUSED_PARAMETER(pSelect);
  pWalker->walkerDepth--;
}


/*
** No-op routine for the parse-tree walker.
**
** When this routine is the Walker.xExprCallback then expression trees
** are walked without any actions being taken at each node.  Presumably,
** when this routine is used for Walker.xExprCallback then 
** Walker.xSelectCallback is set to do something useful for every 
** subquery in the parser tree.
*/
int sqlite3ExprWalkNoop(Walker *NotUsed, Expr *NotUsed2){
  UNUSED_PARAMETER2(NotUsed, NotUsed2);
  return WRC_Continue;
}

/*
** No-op routine for the parse-tree walker for SELECT statements.
** subquery in the parser tree.
*/
int sqlite3SelectWalkNoop(Walker *NotUsed, Select *NotUsed2){
  UNUSED_PARAMETER2(NotUsed, NotUsed2);
  return WRC_Continue;
}
