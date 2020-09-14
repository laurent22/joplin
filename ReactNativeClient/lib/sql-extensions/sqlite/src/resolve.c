/*
** 2008 August 18
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
** This file contains routines used for walking the parser tree and
** resolve all identifiers by associating them with a particular
** table and column.
*/
#include "sqliteInt.h"

/*
** Magic table number to mean the EXCLUDED table in an UPSERT statement.
*/
#define EXCLUDED_TABLE_NUMBER  2

/*
** Walk the expression tree pExpr and increase the aggregate function
** depth (the Expr.op2 field) by N on every TK_AGG_FUNCTION node.
** This needs to occur when copying a TK_AGG_FUNCTION node from an
** outer query into an inner subquery.
**
** incrAggFunctionDepth(pExpr,n) is the main routine.  incrAggDepth(..)
** is a helper function - a callback for the tree walker.
**
** See also the sqlite3WindowExtraAggFuncDepth() routine in window.c
*/
static int incrAggDepth(Walker *pWalker, Expr *pExpr){
  if( pExpr->op==TK_AGG_FUNCTION ) pExpr->op2 += pWalker->u.n;
  return WRC_Continue;
}
static void incrAggFunctionDepth(Expr *pExpr, int N){
  if( N>0 ){
    Walker w;
    memset(&w, 0, sizeof(w));
    w.xExprCallback = incrAggDepth;
    w.u.n = N;
    sqlite3WalkExpr(&w, pExpr);
  }
}

/*
** Turn the pExpr expression into an alias for the iCol-th column of the
** result set in pEList.
**
** If the reference is followed by a COLLATE operator, then make sure
** the COLLATE operator is preserved.  For example:
**
**     SELECT a+b, c+d FROM t1 ORDER BY 1 COLLATE nocase;
**
** Should be transformed into:
**
**     SELECT a+b, c+d FROM t1 ORDER BY (a+b) COLLATE nocase;
**
** The nSubquery parameter specifies how many levels of subquery the
** alias is removed from the original expression.  The usual value is
** zero but it might be more if the alias is contained within a subquery
** of the original expression.  The Expr.op2 field of TK_AGG_FUNCTION
** structures must be increased by the nSubquery amount.
*/
static void resolveAlias(
  Parse *pParse,         /* Parsing context */
  ExprList *pEList,      /* A result set */
  int iCol,              /* A column in the result set.  0..pEList->nExpr-1 */
  Expr *pExpr,           /* Transform this into an alias to the result set */
  const char *zType,     /* "GROUP" or "ORDER" or "" */
  int nSubquery          /* Number of subqueries that the label is moving */
){
  Expr *pOrig;           /* The iCol-th column of the result set */
  Expr *pDup;            /* Copy of pOrig */
  sqlite3 *db;           /* The database connection */

  assert( iCol>=0 && iCol<pEList->nExpr );
  pOrig = pEList->a[iCol].pExpr;
  assert( pOrig!=0 );
  db = pParse->db;
  pDup = sqlite3ExprDup(db, pOrig, 0);
  if( pDup!=0 ){
    if( zType[0]!='G' ) incrAggFunctionDepth(pDup, nSubquery);
    if( pExpr->op==TK_COLLATE ){
      pDup = sqlite3ExprAddCollateString(pParse, pDup, pExpr->u.zToken);
    }

    /* Before calling sqlite3ExprDelete(), set the EP_Static flag. This 
    ** prevents ExprDelete() from deleting the Expr structure itself,
    ** allowing it to be repopulated by the memcpy() on the following line.
    ** The pExpr->u.zToken might point into memory that will be freed by the
    ** sqlite3DbFree(db, pDup) on the last line of this block, so be sure to
    ** make a copy of the token before doing the sqlite3DbFree().
    */
    ExprSetProperty(pExpr, EP_Static);
    sqlite3ExprDelete(db, pExpr);
    memcpy(pExpr, pDup, sizeof(*pExpr));
    if( !ExprHasProperty(pExpr, EP_IntValue) && pExpr->u.zToken!=0 ){
      assert( (pExpr->flags & (EP_Reduced|EP_TokenOnly))==0 );
      pExpr->u.zToken = sqlite3DbStrDup(db, pExpr->u.zToken);
      pExpr->flags |= EP_MemToken;
    }
    if( ExprHasProperty(pExpr, EP_WinFunc) ){
      if( pExpr->y.pWin!=0 ){
        pExpr->y.pWin->pOwner = pExpr;
      }else{
        assert( db->mallocFailed );
      }
    }
    sqlite3DbFree(db, pDup);
  }
  ExprSetProperty(pExpr, EP_Alias);
}


/*
** Return TRUE if the name zCol occurs anywhere in the USING clause.
**
** Return FALSE if the USING clause is NULL or if it does not contain
** zCol.
*/
static int nameInUsingClause(IdList *pUsing, const char *zCol){
  if( pUsing ){
    int k;
    for(k=0; k<pUsing->nId; k++){
      if( sqlite3StrICmp(pUsing->a[k].zName, zCol)==0 ) return 1;
    }
  }
  return 0;
}

/*
** Subqueries stores the original database, table and column names for their
** result sets in ExprList.a[].zSpan, in the form "DATABASE.TABLE.COLUMN".
** Check to see if the zSpan given to this routine matches the zDb, zTab,
** and zCol.  If any of zDb, zTab, and zCol are NULL then those fields will
** match anything.
*/
int sqlite3MatchEName(
  const struct ExprList_item *pItem,
  const char *zCol,
  const char *zTab,
  const char *zDb
){
  int n;
  const char *zSpan;
  if( pItem->eEName!=ENAME_TAB ) return 0;
  zSpan = pItem->zEName;
  for(n=0; ALWAYS(zSpan[n]) && zSpan[n]!='.'; n++){}
  if( zDb && (sqlite3StrNICmp(zSpan, zDb, n)!=0 || zDb[n]!=0) ){
    return 0;
  }
  zSpan += n+1;
  for(n=0; ALWAYS(zSpan[n]) && zSpan[n]!='.'; n++){}
  if( zTab && (sqlite3StrNICmp(zSpan, zTab, n)!=0 || zTab[n]!=0) ){
    return 0;
  }
  zSpan += n+1;
  if( zCol && sqlite3StrICmp(zSpan, zCol)!=0 ){
    return 0;
  }
  return 1;
}

/*
** Return TRUE if the double-quoted string  mis-feature should be supported.
*/
static int areDoubleQuotedStringsEnabled(sqlite3 *db, NameContext *pTopNC){
  if( db->init.busy ) return 1;  /* Always support for legacy schemas */
  if( pTopNC->ncFlags & NC_IsDDL ){
    /* Currently parsing a DDL statement */
    if( sqlite3WritableSchema(db) && (db->flags & SQLITE_DqsDML)!=0 ){
      return 1;
    }
    return (db->flags & SQLITE_DqsDDL)!=0;
  }else{
    /* Currently parsing a DML statement */
    return (db->flags & SQLITE_DqsDML)!=0;
  }
}

/*
** The argument is guaranteed to be a non-NULL Expr node of type TK_COLUMN.
** return the appropriate colUsed mask.
*/
Bitmask sqlite3ExprColUsed(Expr *pExpr){
  int n;
  Table *pExTab;

  n = pExpr->iColumn;
  pExTab = pExpr->y.pTab;
  assert( pExTab!=0 );
  if( (pExTab->tabFlags & TF_HasGenerated)!=0
   && (pExTab->aCol[n].colFlags & COLFLAG_GENERATED)!=0 
  ){
    testcase( pExTab->nCol==BMS-1 );
    testcase( pExTab->nCol==BMS );
    return pExTab->nCol>=BMS ? ALLBITS : MASKBIT(pExTab->nCol)-1;
  }else{
    testcase( n==BMS-1 );
    testcase( n==BMS );
    if( n>=BMS ) n = BMS-1;
    return ((Bitmask)1)<<n;
  }
}

/*
** Given the name of a column of the form X.Y.Z or Y.Z or just Z, look up
** that name in the set of source tables in pSrcList and make the pExpr 
** expression node refer back to that source column.  The following changes
** are made to pExpr:
**
**    pExpr->iDb           Set the index in db->aDb[] of the database X
**                         (even if X is implied).
**    pExpr->iTable        Set to the cursor number for the table obtained
**                         from pSrcList.
**    pExpr->y.pTab        Points to the Table structure of X.Y (even if
**                         X and/or Y are implied.)
**    pExpr->iColumn       Set to the column number within the table.
**    pExpr->op            Set to TK_COLUMN.
**    pExpr->pLeft         Any expression this points to is deleted
**    pExpr->pRight        Any expression this points to is deleted.
**
** The zDb variable is the name of the database (the "X").  This value may be
** NULL meaning that name is of the form Y.Z or Z.  Any available database
** can be used.  The zTable variable is the name of the table (the "Y").  This
** value can be NULL if zDb is also NULL.  If zTable is NULL it
** means that the form of the name is Z and that columns from any table
** can be used.
**
** If the name cannot be resolved unambiguously, leave an error message
** in pParse and return WRC_Abort.  Return WRC_Prune on success.
*/
static int lookupName(
  Parse *pParse,       /* The parsing context */
  const char *zDb,     /* Name of the database containing table, or NULL */
  const char *zTab,    /* Name of table containing column, or NULL */
  const char *zCol,    /* Name of the column. */
  NameContext *pNC,    /* The name context used to resolve the name */
  Expr *pExpr          /* Make this EXPR node point to the selected column */
){
  int i, j;                         /* Loop counters */
  int cnt = 0;                      /* Number of matching column names */
  int cntTab = 0;                   /* Number of matching table names */
  int nSubquery = 0;                /* How many levels of subquery */
  sqlite3 *db = pParse->db;         /* The database connection */
  struct SrcList_item *pItem;       /* Use for looping over pSrcList items */
  struct SrcList_item *pMatch = 0;  /* The matching pSrcList item */
  NameContext *pTopNC = pNC;        /* First namecontext in the list */
  Schema *pSchema = 0;              /* Schema of the expression */
  int eNewExprOp = TK_COLUMN;       /* New value for pExpr->op on success */
  Table *pTab = 0;                  /* Table hold the row */
  Column *pCol;                     /* A column of pTab */

  assert( pNC );     /* the name context cannot be NULL. */
  assert( zCol );    /* The Z in X.Y.Z cannot be NULL */
  assert( !ExprHasProperty(pExpr, EP_TokenOnly|EP_Reduced) );

  /* Initialize the node to no-match */
  pExpr->iTable = -1;
  ExprSetVVAProperty(pExpr, EP_NoReduce);

  /* Translate the schema name in zDb into a pointer to the corresponding
  ** schema.  If not found, pSchema will remain NULL and nothing will match
  ** resulting in an appropriate error message toward the end of this routine
  */
  if( zDb ){
    testcase( pNC->ncFlags & NC_PartIdx );
    testcase( pNC->ncFlags & NC_IsCheck );
    if( (pNC->ncFlags & (NC_PartIdx|NC_IsCheck))!=0 ){
      /* Silently ignore database qualifiers inside CHECK constraints and
      ** partial indices.  Do not raise errors because that might break
      ** legacy and because it does not hurt anything to just ignore the
      ** database name. */
      zDb = 0;
    }else{
      for(i=0; i<db->nDb; i++){
        assert( db->aDb[i].zDbSName );
        if( sqlite3StrICmp(db->aDb[i].zDbSName,zDb)==0 ){
          pSchema = db->aDb[i].pSchema;
          break;
        }
      }
      if( i==db->nDb && sqlite3StrICmp("main", zDb)==0 ){
        /* This branch is taken when the main database has been renamed
        ** using SQLITE_DBCONFIG_MAINDBNAME. */
        pSchema = db->aDb[0].pSchema;
        zDb = db->aDb[0].zDbSName;
      }
    }
  }

  /* Start at the inner-most context and move outward until a match is found */
  assert( pNC && cnt==0 );
  do{
    ExprList *pEList;
    SrcList *pSrcList = pNC->pSrcList;

    if( pSrcList ){
      for(i=0, pItem=pSrcList->a; i<pSrcList->nSrc; i++, pItem++){
        u8 hCol;
        pTab = pItem->pTab;
        assert( pTab!=0 && pTab->zName!=0 );
        assert( pTab->nCol>0 );
        if( pItem->pSelect && (pItem->pSelect->selFlags & SF_NestedFrom)!=0 ){
          int hit = 0;
          pEList = pItem->pSelect->pEList;
          for(j=0; j<pEList->nExpr; j++){
            if( sqlite3MatchEName(&pEList->a[j], zCol, zTab, zDb) ){
              cnt++;
              cntTab = 2;
              pMatch = pItem;
              pExpr->iColumn = j;
              hit = 1;
            }
          }
          if( hit || zTab==0 ) continue;
        }
        if( zDb && pTab->pSchema!=pSchema ){
          continue;
        }
        if( zTab ){
          const char *zTabName = pItem->zAlias ? pItem->zAlias : pTab->zName;
          assert( zTabName!=0 );
          if( sqlite3StrICmp(zTabName, zTab)!=0 ){
            continue;
          }
          if( IN_RENAME_OBJECT && pItem->zAlias ){
            sqlite3RenameTokenRemap(pParse, 0, (void*)&pExpr->y.pTab);
          }
        }
        if( 0==(cntTab++) ){
          pMatch = pItem;
        }
        hCol = sqlite3StrIHash(zCol);
        for(j=0, pCol=pTab->aCol; j<pTab->nCol; j++, pCol++){
          if( pCol->hName==hCol && sqlite3StrICmp(pCol->zName, zCol)==0 ){
            /* If there has been exactly one prior match and this match
            ** is for the right-hand table of a NATURAL JOIN or is in a 
            ** USING clause, then skip this match.
            */
            if( cnt==1 ){
              if( pItem->fg.jointype & JT_NATURAL ) continue;
              if( nameInUsingClause(pItem->pUsing, zCol) ) continue;
            }
            cnt++;
            pMatch = pItem;
            /* Substitute the rowid (column -1) for the INTEGER PRIMARY KEY */
            pExpr->iColumn = j==pTab->iPKey ? -1 : (i16)j;
            break;
          }
        }
      }
      if( pMatch ){
        pExpr->iTable = pMatch->iCursor;
        pExpr->y.pTab = pMatch->pTab;
        /* RIGHT JOIN not (yet) supported */
        assert( (pMatch->fg.jointype & JT_RIGHT)==0 );
        if( (pMatch->fg.jointype & JT_LEFT)!=0 ){
          ExprSetProperty(pExpr, EP_CanBeNull);
        }
        pSchema = pExpr->y.pTab->pSchema;
      }
    } /* if( pSrcList ) */

#if !defined(SQLITE_OMIT_TRIGGER) || !defined(SQLITE_OMIT_UPSERT)
    /* If we have not already resolved the name, then maybe 
    ** it is a new.* or old.* trigger argument reference.  Or
    ** maybe it is an excluded.* from an upsert.
    */
    if( zDb==0 && zTab!=0 && cntTab==0 ){
      pTab = 0;
#ifndef SQLITE_OMIT_TRIGGER
      if( pParse->pTriggerTab!=0 ){
        int op = pParse->eTriggerOp;
        assert( op==TK_DELETE || op==TK_UPDATE || op==TK_INSERT );
        if( op!=TK_DELETE && sqlite3StrICmp("new",zTab) == 0 ){
          pExpr->iTable = 1;
          pTab = pParse->pTriggerTab;
        }else if( op!=TK_INSERT && sqlite3StrICmp("old",zTab)==0 ){
          pExpr->iTable = 0;
          pTab = pParse->pTriggerTab;
        }
      }
#endif /* SQLITE_OMIT_TRIGGER */
#ifndef SQLITE_OMIT_UPSERT
      if( (pNC->ncFlags & NC_UUpsert)!=0 ){
        Upsert *pUpsert = pNC->uNC.pUpsert;
        if( pUpsert && sqlite3StrICmp("excluded",zTab)==0 ){
          pTab = pUpsert->pUpsertSrc->a[0].pTab;
          pExpr->iTable = EXCLUDED_TABLE_NUMBER;
        }
      }
#endif /* SQLITE_OMIT_UPSERT */

      if( pTab ){ 
        int iCol;
        u8 hCol = sqlite3StrIHash(zCol);
        pSchema = pTab->pSchema;
        cntTab++;
        for(iCol=0, pCol=pTab->aCol; iCol<pTab->nCol; iCol++, pCol++){
          if( pCol->hName==hCol && sqlite3StrICmp(pCol->zName, zCol)==0 ){
            if( iCol==pTab->iPKey ){
              iCol = -1;
            }
            break;
          }
        }
        if( iCol>=pTab->nCol && sqlite3IsRowid(zCol) && VisibleRowid(pTab) ){
          /* IMP: R-51414-32910 */
          iCol = -1;
        }
        if( iCol<pTab->nCol ){
          cnt++;
#ifndef SQLITE_OMIT_UPSERT
          if( pExpr->iTable==EXCLUDED_TABLE_NUMBER ){
            testcase( iCol==(-1) );
            if( IN_RENAME_OBJECT ){
              pExpr->iColumn = iCol;
              pExpr->y.pTab = pTab;
              eNewExprOp = TK_COLUMN;
            }else{
              pExpr->iTable = pNC->uNC.pUpsert->regData +
                 sqlite3TableColumnToStorage(pTab, iCol);
              eNewExprOp = TK_REGISTER;
              ExprSetProperty(pExpr, EP_Alias);
            }
          }else
#endif /* SQLITE_OMIT_UPSERT */
          {
#ifndef SQLITE_OMIT_TRIGGER
            if( iCol<0 ){
              pExpr->affExpr = SQLITE_AFF_INTEGER;
            }else if( pExpr->iTable==0 ){
              testcase( iCol==31 );
              testcase( iCol==32 );
              pParse->oldmask |= (iCol>=32 ? 0xffffffff : (((u32)1)<<iCol));
            }else{
              testcase( iCol==31 );
              testcase( iCol==32 );
              pParse->newmask |= (iCol>=32 ? 0xffffffff : (((u32)1)<<iCol));
            }
            pExpr->y.pTab = pTab;
            pExpr->iColumn = (i16)iCol;
            eNewExprOp = TK_TRIGGER;
#endif /* SQLITE_OMIT_TRIGGER */
          }
        }
      }
    }
#endif /* !defined(SQLITE_OMIT_TRIGGER) || !defined(SQLITE_OMIT_UPSERT) */

    /*
    ** Perhaps the name is a reference to the ROWID
    */
    if( cnt==0
     && cntTab==1
     && pMatch
     && (pNC->ncFlags & (NC_IdxExpr|NC_GenCol))==0
     && sqlite3IsRowid(zCol)
     && VisibleRowid(pMatch->pTab)
    ){
      cnt = 1;
      pExpr->iColumn = -1;
      pExpr->affExpr = SQLITE_AFF_INTEGER;
    }

    /*
    ** If the input is of the form Z (not Y.Z or X.Y.Z) then the name Z
    ** might refer to an result-set alias.  This happens, for example, when
    ** we are resolving names in the WHERE clause of the following command:
    **
    **     SELECT a+b AS x FROM table WHERE x<10;
    **
    ** In cases like this, replace pExpr with a copy of the expression that
    ** forms the result set entry ("a+b" in the example) and return immediately.
    ** Note that the expression in the result set should have already been
    ** resolved by the time the WHERE clause is resolved.
    **
    ** The ability to use an output result-set column in the WHERE, GROUP BY,
    ** or HAVING clauses, or as part of a larger expression in the ORDER BY
    ** clause is not standard SQL.  This is a (goofy) SQLite extension, that
    ** is supported for backwards compatibility only. Hence, we issue a warning
    ** on sqlite3_log() whenever the capability is used.
    */
    if( (pNC->ncFlags & NC_UEList)!=0
     && cnt==0
     && zTab==0
    ){
      pEList = pNC->uNC.pEList;
      assert( pEList!=0 );
      for(j=0; j<pEList->nExpr; j++){
        char *zAs = pEList->a[j].zEName;
        if( pEList->a[j].eEName==ENAME_NAME
         && sqlite3_stricmp(zAs, zCol)==0
        ){
          Expr *pOrig;
          assert( pExpr->pLeft==0 && pExpr->pRight==0 );
          assert( pExpr->x.pList==0 );
          assert( pExpr->x.pSelect==0 );
          pOrig = pEList->a[j].pExpr;
          if( (pNC->ncFlags&NC_AllowAgg)==0 && ExprHasProperty(pOrig, EP_Agg) ){
            sqlite3ErrorMsg(pParse, "misuse of aliased aggregate %s", zAs);
            return WRC_Abort;
          }
          if( ExprHasProperty(pOrig, EP_Win)
           && ((pNC->ncFlags&NC_AllowWin)==0 || pNC!=pTopNC )
          ){
            sqlite3ErrorMsg(pParse, "misuse of aliased window function %s",zAs);
            return WRC_Abort;
          }
          if( sqlite3ExprVectorSize(pOrig)!=1 ){
            sqlite3ErrorMsg(pParse, "row value misused");
            return WRC_Abort;
          }
          resolveAlias(pParse, pEList, j, pExpr, "", nSubquery);
          cnt = 1;
          pMatch = 0;
          assert( zTab==0 && zDb==0 );
          if( IN_RENAME_OBJECT ){
            sqlite3RenameTokenRemap(pParse, 0, (void*)pExpr);
          }
          goto lookupname_end;
        }
      } 
    }

    /* Advance to the next name context.  The loop will exit when either
    ** we have a match (cnt>0) or when we run out of name contexts.
    */
    if( cnt ) break;
    pNC = pNC->pNext;
    nSubquery++;
  }while( pNC );


  /*
  ** If X and Y are NULL (in other words if only the column name Z is
  ** supplied) and the value of Z is enclosed in double-quotes, then
  ** Z is a string literal if it doesn't match any column names.  In that
  ** case, we need to return right away and not make any changes to
  ** pExpr.
  **
  ** Because no reference was made to outer contexts, the pNC->nRef
  ** fields are not changed in any context.
  */
  if( cnt==0 && zTab==0 ){
    assert( pExpr->op==TK_ID );
    if( ExprHasProperty(pExpr,EP_DblQuoted)
     && areDoubleQuotedStringsEnabled(db, pTopNC)
    ){
      /* If a double-quoted identifier does not match any known column name,
      ** then treat it as a string.
      **
      ** This hack was added in the early days of SQLite in a misguided attempt
      ** to be compatible with MySQL 3.x, which used double-quotes for strings.
      ** I now sorely regret putting in this hack. The effect of this hack is
      ** that misspelled identifier names are silently converted into strings
      ** rather than causing an error, to the frustration of countless
      ** programmers. To all those frustrated programmers, my apologies.
      **
      ** Someday, I hope to get rid of this hack. Unfortunately there is
      ** a huge amount of legacy SQL that uses it. So for now, we just
      ** issue a warning.
      */
      sqlite3_log(SQLITE_WARNING,
        "double-quoted string literal: \"%w\"", zCol);
#ifdef SQLITE_ENABLE_NORMALIZE
      sqlite3VdbeAddDblquoteStr(db, pParse->pVdbe, zCol);
#endif
      pExpr->op = TK_STRING;
      pExpr->y.pTab = 0;
      return WRC_Prune;
    }
    if( sqlite3ExprIdToTrueFalse(pExpr) ){
      return WRC_Prune;
    }
  }

  /*
  ** cnt==0 means there was not match.  cnt>1 means there were two or
  ** more matches.  Either way, we have an error.
  */
  if( cnt!=1 ){
    const char *zErr;
    zErr = cnt==0 ? "no such column" : "ambiguous column name";
    if( zDb ){
      sqlite3ErrorMsg(pParse, "%s: %s.%s.%s", zErr, zDb, zTab, zCol);
    }else if( zTab ){
      sqlite3ErrorMsg(pParse, "%s: %s.%s", zErr, zTab, zCol);
    }else{
      sqlite3ErrorMsg(pParse, "%s: %s", zErr, zCol);
    }
    pParse->checkSchema = 1;
    pTopNC->nErr++;
  }

  /* If a column from a table in pSrcList is referenced, then record
  ** this fact in the pSrcList.a[].colUsed bitmask.  Column 0 causes
  ** bit 0 to be set.  Column 1 sets bit 1.  And so forth.  Bit 63 is
  ** set if the 63rd or any subsequent column is used.
  **
  ** The colUsed mask is an optimization used to help determine if an
  ** index is a covering index.  The correct answer is still obtained
  ** if the mask contains extra set bits.  However, it is important to
  ** avoid setting bits beyond the maximum column number of the table.
  ** (See ticket [b92e5e8ec2cdbaa1]).
  **
  ** If a generated column is referenced, set bits for every column
  ** of the table.
  */
  if( pExpr->iColumn>=0 && pMatch!=0 ){
    pMatch->colUsed |= sqlite3ExprColUsed(pExpr);
  }

  /* Clean up and return
  */
  sqlite3ExprDelete(db, pExpr->pLeft);
  pExpr->pLeft = 0;
  sqlite3ExprDelete(db, pExpr->pRight);
  pExpr->pRight = 0;
  pExpr->op = eNewExprOp;
  ExprSetProperty(pExpr, EP_Leaf);
lookupname_end:
  if( cnt==1 ){
    assert( pNC!=0 );
    if( !ExprHasProperty(pExpr, EP_Alias) ){
      sqlite3AuthRead(pParse, pExpr, pSchema, pNC->pSrcList);
    }
    /* Increment the nRef value on all name contexts from TopNC up to
    ** the point where the name matched. */
    for(;;){
      assert( pTopNC!=0 );
      pTopNC->nRef++;
      if( pTopNC==pNC ) break;
      pTopNC = pTopNC->pNext;
    }
    return WRC_Prune;
  } else {
    return WRC_Abort;
  }
}

/*
** Allocate and return a pointer to an expression to load the column iCol
** from datasource iSrc in SrcList pSrc.
*/
Expr *sqlite3CreateColumnExpr(sqlite3 *db, SrcList *pSrc, int iSrc, int iCol){
  Expr *p = sqlite3ExprAlloc(db, TK_COLUMN, 0, 0);
  if( p ){
    struct SrcList_item *pItem = &pSrc->a[iSrc];
    Table *pTab = p->y.pTab = pItem->pTab;
    p->iTable = pItem->iCursor;
    if( p->y.pTab->iPKey==iCol ){
      p->iColumn = -1;
    }else{
      p->iColumn = (ynVar)iCol;
      if( (pTab->tabFlags & TF_HasGenerated)!=0
       && (pTab->aCol[iCol].colFlags & COLFLAG_GENERATED)!=0
      ){
        testcase( pTab->nCol==63 );
        testcase( pTab->nCol==64 );
        pItem->colUsed = pTab->nCol>=64 ? ALLBITS : MASKBIT(pTab->nCol)-1;
      }else{
        testcase( iCol==BMS );
        testcase( iCol==BMS-1 );
        pItem->colUsed |= ((Bitmask)1)<<(iCol>=BMS ? BMS-1 : iCol);
      }
    }
  }
  return p;
}

/*
** Report an error that an expression is not valid for some set of
** pNC->ncFlags values determined by validMask.
**
** static void notValid(
**   Parse *pParse,       // Leave error message here
**   NameContext *pNC,    // The name context 
**   const char *zMsg,    // Type of error
**   int validMask,       // Set of contexts for which prohibited
**   Expr *pExpr          // Invalidate this expression on error
** ){...}
**
** As an optimization, since the conditional is almost always false
** (because errors are rare), the conditional is moved outside of the
** function call using a macro.
*/
static void notValidImpl(
   Parse *pParse,       /* Leave error message here */
   NameContext *pNC,    /* The name context */
   const char *zMsg,    /* Type of error */
   Expr *pExpr          /* Invalidate this expression on error */
){
  const char *zIn = "partial index WHERE clauses";
  if( pNC->ncFlags & NC_IdxExpr )      zIn = "index expressions";
#ifndef SQLITE_OMIT_CHECK
  else if( pNC->ncFlags & NC_IsCheck ) zIn = "CHECK constraints";
#endif
#ifndef SQLITE_OMIT_GENERATED_COLUMNS
  else if( pNC->ncFlags & NC_GenCol ) zIn = "generated columns";
#endif
  sqlite3ErrorMsg(pParse, "%s prohibited in %s", zMsg, zIn);
  if( pExpr ) pExpr->op = TK_NULL;
}
#define sqlite3ResolveNotValid(P,N,M,X,E) \
  assert( ((X)&~(NC_IsCheck|NC_PartIdx|NC_IdxExpr|NC_GenCol))==0 ); \
  if( ((N)->ncFlags & (X))!=0 ) notValidImpl(P,N,M,E);

/*
** Expression p should encode a floating point value between 1.0 and 0.0.
** Return 1024 times this value.  Or return -1 if p is not a floating point
** value between 1.0 and 0.0.
*/
static int exprProbability(Expr *p){
  double r = -1.0;
  if( p->op!=TK_FLOAT ) return -1;
  sqlite3AtoF(p->u.zToken, &r, sqlite3Strlen30(p->u.zToken), SQLITE_UTF8);
  assert( r>=0.0 );
  if( r>1.0 ) return -1;
  return (int)(r*134217728.0);
}

/*
** This routine is callback for sqlite3WalkExpr().
**
** Resolve symbolic names into TK_COLUMN operators for the current
** node in the expression tree.  Return 0 to continue the search down
** the tree or 2 to abort the tree walk.
**
** This routine also does error checking and name resolution for
** function names.  The operator for aggregate functions is changed
** to TK_AGG_FUNCTION.
*/
static int resolveExprStep(Walker *pWalker, Expr *pExpr){
  NameContext *pNC;
  Parse *pParse;

  pNC = pWalker->u.pNC;
  assert( pNC!=0 );
  pParse = pNC->pParse;
  assert( pParse==pWalker->pParse );

#ifndef NDEBUG
  if( pNC->pSrcList && pNC->pSrcList->nAlloc>0 ){
    SrcList *pSrcList = pNC->pSrcList;
    int i;
    for(i=0; i<pNC->pSrcList->nSrc; i++){
      assert( pSrcList->a[i].iCursor>=0 && pSrcList->a[i].iCursor<pParse->nTab);
    }
  }
#endif
  switch( pExpr->op ){

    /* The special operator TK_ROW means use the rowid for the first
    ** column in the FROM clause.  This is used by the LIMIT and ORDER BY
    ** clause processing on UPDATE and DELETE statements, and by 
    ** UPDATE ... FROM statement processing.
    */
    case TK_ROW: {
      SrcList *pSrcList = pNC->pSrcList;
      struct SrcList_item *pItem;
      assert( pSrcList && pSrcList->nSrc>=1 );
      pItem = pSrcList->a;
      pExpr->op = TK_COLUMN;
      pExpr->y.pTab = pItem->pTab;
      pExpr->iTable = pItem->iCursor;
      pExpr->iColumn--;
      pExpr->affExpr = SQLITE_AFF_INTEGER;
      break;
    }

    /* A column name:                    ID
    ** Or table name and column name:    ID.ID
    ** Or a database, table and column:  ID.ID.ID
    **
    ** The TK_ID and TK_OUT cases are combined so that there will only
    ** be one call to lookupName().  Then the compiler will in-line 
    ** lookupName() for a size reduction and performance increase.
    */
    case TK_ID:
    case TK_DOT: {
      const char *zColumn;
      const char *zTable;
      const char *zDb;
      Expr *pRight;

      if( pExpr->op==TK_ID ){
        zDb = 0;
        zTable = 0;
        zColumn = pExpr->u.zToken;
      }else{
        Expr *pLeft = pExpr->pLeft;
        testcase( pNC->ncFlags & NC_IdxExpr );
        testcase( pNC->ncFlags & NC_GenCol );
        sqlite3ResolveNotValid(pParse, pNC, "the \".\" operator",
                               NC_IdxExpr|NC_GenCol, 0);
        pRight = pExpr->pRight;
        if( pRight->op==TK_ID ){
          zDb = 0;
        }else{
          assert( pRight->op==TK_DOT );
          zDb = pLeft->u.zToken;
          pLeft = pRight->pLeft;
          pRight = pRight->pRight;
        }
        zTable = pLeft->u.zToken;
        zColumn = pRight->u.zToken;
        if( IN_RENAME_OBJECT ){
          sqlite3RenameTokenRemap(pParse, (void*)pExpr, (void*)pRight);
          sqlite3RenameTokenRemap(pParse, (void*)&pExpr->y.pTab, (void*)pLeft);
        }
      }
      return lookupName(pParse, zDb, zTable, zColumn, pNC, pExpr);
    }

    /* Resolve function names
    */
    case TK_FUNCTION: {
      ExprList *pList = pExpr->x.pList;    /* The argument list */
      int n = pList ? pList->nExpr : 0;    /* Number of arguments */
      int no_such_func = 0;       /* True if no such function exists */
      int wrong_num_args = 0;     /* True if wrong number of arguments */
      int is_agg = 0;             /* True if is an aggregate function */
      int nId;                    /* Number of characters in function name */
      const char *zId;            /* The function name. */
      FuncDef *pDef;              /* Information about the function */
      u8 enc = ENC(pParse->db);   /* The database encoding */
      int savedAllowFlags = (pNC->ncFlags & (NC_AllowAgg | NC_AllowWin));
#ifndef SQLITE_OMIT_WINDOWFUNC
      Window *pWin = (IsWindowFunc(pExpr) ? pExpr->y.pWin : 0);
#endif
      assert( !ExprHasProperty(pExpr, EP_xIsSelect) );
      zId = pExpr->u.zToken;
      nId = sqlite3Strlen30(zId);
      pDef = sqlite3FindFunction(pParse->db, zId, n, enc, 0);
      if( pDef==0 ){
        pDef = sqlite3FindFunction(pParse->db, zId, -2, enc, 0);
        if( pDef==0 ){
          no_such_func = 1;
        }else{
          wrong_num_args = 1;
        }
      }else{
        is_agg = pDef->xFinalize!=0;
        if( pDef->funcFlags & SQLITE_FUNC_UNLIKELY ){
          ExprSetProperty(pExpr, EP_Unlikely);
          if( n==2 ){
            pExpr->iTable = exprProbability(pList->a[1].pExpr);
            if( pExpr->iTable<0 ){
              sqlite3ErrorMsg(pParse,
                "second argument to likelihood() must be a "
                "constant between 0.0 and 1.0");
              pNC->nErr++;
            }
          }else{
            /* EVIDENCE-OF: R-61304-29449 The unlikely(X) function is
            ** equivalent to likelihood(X, 0.0625).
            ** EVIDENCE-OF: R-01283-11636 The unlikely(X) function is
            ** short-hand for likelihood(X,0.0625).
            ** EVIDENCE-OF: R-36850-34127 The likely(X) function is short-hand
            ** for likelihood(X,0.9375).
            ** EVIDENCE-OF: R-53436-40973 The likely(X) function is equivalent
            ** to likelihood(X,0.9375). */
            /* TUNING: unlikely() probability is 0.0625.  likely() is 0.9375 */
            pExpr->iTable = pDef->zName[0]=='u' ? 8388608 : 125829120;
          }             
        }
#ifndef SQLITE_OMIT_AUTHORIZATION
        {
          int auth = sqlite3AuthCheck(pParse, SQLITE_FUNCTION, 0,pDef->zName,0);
          if( auth!=SQLITE_OK ){
            if( auth==SQLITE_DENY ){
              sqlite3ErrorMsg(pParse, "not authorized to use function: %s",
                                      pDef->zName);
              pNC->nErr++;
            }
            pExpr->op = TK_NULL;
            return WRC_Prune;
          }
        }
#endif
        if( pDef->funcFlags & (SQLITE_FUNC_CONSTANT|SQLITE_FUNC_SLOCHNG) ){
          /* For the purposes of the EP_ConstFunc flag, date and time
          ** functions and other functions that change slowly are considered
          ** constant because they are constant for the duration of one query.
          ** This allows them to be factored out of inner loops. */
          ExprSetProperty(pExpr,EP_ConstFunc);
        }
        if( (pDef->funcFlags & SQLITE_FUNC_CONSTANT)==0 ){
          /* Clearly non-deterministic functions like random(), but also
          ** date/time functions that use 'now', and other functions like
          ** sqlite_version() that might change over time cannot be used
          ** in an index or generated column.  Curiously, they can be used
          ** in a CHECK constraint.  SQLServer, MySQL, and PostgreSQL all
          ** all this. */
          sqlite3ResolveNotValid(pParse, pNC, "non-deterministic functions",
                                 NC_IdxExpr|NC_PartIdx|NC_GenCol, 0);
        }else{
          assert( (NC_SelfRef & 0xff)==NC_SelfRef ); /* Must fit in 8 bits */
          pExpr->op2 = pNC->ncFlags & NC_SelfRef;
          if( pNC->ncFlags & NC_FromDDL ) ExprSetProperty(pExpr, EP_FromDDL);
        }
        if( (pDef->funcFlags & SQLITE_FUNC_INTERNAL)!=0
         && pParse->nested==0
         && (pParse->db->mDbFlags & DBFLAG_InternalFunc)==0
        ){
          /* Internal-use-only functions are disallowed unless the
          ** SQL is being compiled using sqlite3NestedParse() or
          ** the SQLITE_TESTCTRL_INTERNAL_FUNCTIONS test-control has be
          ** used to activate internal functionsn for testing purposes */
          no_such_func = 1;
          pDef = 0;
        }else
        if( (pDef->funcFlags & (SQLITE_FUNC_DIRECT|SQLITE_FUNC_UNSAFE))!=0
         && !IN_RENAME_OBJECT
        ){
          sqlite3ExprFunctionUsable(pParse, pExpr, pDef);
        }
      }

      if( 0==IN_RENAME_OBJECT ){
#ifndef SQLITE_OMIT_WINDOWFUNC
        assert( is_agg==0 || (pDef->funcFlags & SQLITE_FUNC_MINMAX)
          || (pDef->xValue==0 && pDef->xInverse==0)
          || (pDef->xValue && pDef->xInverse && pDef->xSFunc && pDef->xFinalize)
        );
        if( pDef && pDef->xValue==0 && pWin ){
          sqlite3ErrorMsg(pParse, 
              "%.*s() may not be used as a window function", nId, zId
          );
          pNC->nErr++;
        }else if( 
              (is_agg && (pNC->ncFlags & NC_AllowAgg)==0)
           || (is_agg && (pDef->funcFlags&SQLITE_FUNC_WINDOW) && !pWin)
           || (is_agg && pWin && (pNC->ncFlags & NC_AllowWin)==0)
        ){
          const char *zType;
          if( (pDef->funcFlags & SQLITE_FUNC_WINDOW) || pWin ){
            zType = "window";
          }else{
            zType = "aggregate";
          }
          sqlite3ErrorMsg(pParse, "misuse of %s function %.*s()",zType,nId,zId);
          pNC->nErr++;
          is_agg = 0;
        }
#else
        if( (is_agg && (pNC->ncFlags & NC_AllowAgg)==0) ){
          sqlite3ErrorMsg(pParse,"misuse of aggregate function %.*s()",nId,zId);
          pNC->nErr++;
          is_agg = 0;
        }
#endif
        else if( no_such_func && pParse->db->init.busy==0
#ifdef SQLITE_ENABLE_UNKNOWN_SQL_FUNCTION
                  && pParse->explain==0
#endif
        ){
          sqlite3ErrorMsg(pParse, "no such function: %.*s", nId, zId);
          pNC->nErr++;
        }else if( wrong_num_args ){
          sqlite3ErrorMsg(pParse,"wrong number of arguments to function %.*s()",
               nId, zId);
          pNC->nErr++;
        }
#ifndef SQLITE_OMIT_WINDOWFUNC
        else if( is_agg==0 && ExprHasProperty(pExpr, EP_WinFunc) ){
          sqlite3ErrorMsg(pParse, 
              "FILTER may not be used with non-aggregate %.*s()", 
              nId, zId
          );
          pNC->nErr++;
        }
#endif
        if( is_agg ){
          /* Window functions may not be arguments of aggregate functions.
          ** Or arguments of other window functions. But aggregate functions
          ** may be arguments for window functions.  */
#ifndef SQLITE_OMIT_WINDOWFUNC
          pNC->ncFlags &= ~(NC_AllowWin | (!pWin ? NC_AllowAgg : 0));
#else
          pNC->ncFlags &= ~NC_AllowAgg;
#endif
        }
      }
#ifndef SQLITE_OMIT_WINDOWFUNC
      else if( ExprHasProperty(pExpr, EP_WinFunc) ){
        is_agg = 1;
      }
#endif
      sqlite3WalkExprList(pWalker, pList);
      if( is_agg ){
#ifndef SQLITE_OMIT_WINDOWFUNC
        if( pWin ){
          Select *pSel = pNC->pWinSelect;
          assert( pWin==pExpr->y.pWin );
          if( IN_RENAME_OBJECT==0 ){
            sqlite3WindowUpdate(pParse, pSel ? pSel->pWinDefn : 0, pWin, pDef);
          }
          sqlite3WalkExprList(pWalker, pWin->pPartition);
          sqlite3WalkExprList(pWalker, pWin->pOrderBy);
          sqlite3WalkExpr(pWalker, pWin->pFilter);
          sqlite3WindowLink(pSel, pWin);
          pNC->ncFlags |= NC_HasWin;
        }else
#endif /* SQLITE_OMIT_WINDOWFUNC */
        {
          NameContext *pNC2 = pNC;
          pExpr->op = TK_AGG_FUNCTION;
          pExpr->op2 = 0;
#ifndef SQLITE_OMIT_WINDOWFUNC
          if( ExprHasProperty(pExpr, EP_WinFunc) ){
            sqlite3WalkExpr(pWalker, pExpr->y.pWin->pFilter);
          }
#endif
          while( pNC2 && !sqlite3FunctionUsesThisSrc(pExpr, pNC2->pSrcList) ){
            pExpr->op2++;
            pNC2 = pNC2->pNext;
          }
          assert( pDef!=0 || IN_RENAME_OBJECT );
          if( pNC2 && pDef ){
            assert( SQLITE_FUNC_MINMAX==NC_MinMaxAgg );
            testcase( (pDef->funcFlags & SQLITE_FUNC_MINMAX)!=0 );
            pNC2->ncFlags |= NC_HasAgg | (pDef->funcFlags & SQLITE_FUNC_MINMAX);

          }
        }
        pNC->ncFlags |= savedAllowFlags;
      }
      /* FIX ME:  Compute pExpr->affinity based on the expected return
      ** type of the function 
      */
      return WRC_Prune;
    }
#ifndef SQLITE_OMIT_SUBQUERY
    case TK_SELECT:
    case TK_EXISTS:  testcase( pExpr->op==TK_EXISTS );
#endif
    case TK_IN: {
      testcase( pExpr->op==TK_IN );
      if( ExprHasProperty(pExpr, EP_xIsSelect) ){
        int nRef = pNC->nRef;
        testcase( pNC->ncFlags & NC_IsCheck );
        testcase( pNC->ncFlags & NC_PartIdx );
        testcase( pNC->ncFlags & NC_IdxExpr );
        testcase( pNC->ncFlags & NC_GenCol );
        sqlite3ResolveNotValid(pParse, pNC, "subqueries",
                 NC_IsCheck|NC_PartIdx|NC_IdxExpr|NC_GenCol, pExpr);
        sqlite3WalkSelect(pWalker, pExpr->x.pSelect);
        assert( pNC->nRef>=nRef );
        if( nRef!=pNC->nRef ){
          ExprSetProperty(pExpr, EP_VarSelect);
          pNC->ncFlags |= NC_VarSelect;
        }
      }
      break;
    }
    case TK_VARIABLE: {
      testcase( pNC->ncFlags & NC_IsCheck );
      testcase( pNC->ncFlags & NC_PartIdx );
      testcase( pNC->ncFlags & NC_IdxExpr );
      testcase( pNC->ncFlags & NC_GenCol );
      sqlite3ResolveNotValid(pParse, pNC, "parameters",
               NC_IsCheck|NC_PartIdx|NC_IdxExpr|NC_GenCol, pExpr);
      break;
    }
    case TK_IS:
    case TK_ISNOT: {
      Expr *pRight = sqlite3ExprSkipCollateAndLikely(pExpr->pRight);
      assert( !ExprHasProperty(pExpr, EP_Reduced) );
      /* Handle special cases of "x IS TRUE", "x IS FALSE", "x IS NOT TRUE",
      ** and "x IS NOT FALSE". */
      if( pRight && pRight->op==TK_ID ){
        int rc = resolveExprStep(pWalker, pRight);
        if( rc==WRC_Abort ) return WRC_Abort;
        if( pRight->op==TK_TRUEFALSE ){
          pExpr->op2 = pExpr->op;
          pExpr->op = TK_TRUTH;
          return WRC_Continue;
        }
      }
      /* no break */ deliberate_fall_through
    }
    case TK_BETWEEN:
    case TK_EQ:
    case TK_NE:
    case TK_LT:
    case TK_LE:
    case TK_GT:
    case TK_GE: {
      int nLeft, nRight;
      if( pParse->db->mallocFailed ) break;
      assert( pExpr->pLeft!=0 );
      nLeft = sqlite3ExprVectorSize(pExpr->pLeft);
      if( pExpr->op==TK_BETWEEN ){
        nRight = sqlite3ExprVectorSize(pExpr->x.pList->a[0].pExpr);
        if( nRight==nLeft ){
          nRight = sqlite3ExprVectorSize(pExpr->x.pList->a[1].pExpr);
        }
      }else{
        assert( pExpr->pRight!=0 );
        nRight = sqlite3ExprVectorSize(pExpr->pRight);
      }
      if( nLeft!=nRight ){
        testcase( pExpr->op==TK_EQ );
        testcase( pExpr->op==TK_NE );
        testcase( pExpr->op==TK_LT );
        testcase( pExpr->op==TK_LE );
        testcase( pExpr->op==TK_GT );
        testcase( pExpr->op==TK_GE );
        testcase( pExpr->op==TK_IS );
        testcase( pExpr->op==TK_ISNOT );
        testcase( pExpr->op==TK_BETWEEN );
        sqlite3ErrorMsg(pParse, "row value misused");
      }
      break; 
    }
  }
  return (pParse->nErr || pParse->db->mallocFailed) ? WRC_Abort : WRC_Continue;
}

/*
** pEList is a list of expressions which are really the result set of the
** a SELECT statement.  pE is a term in an ORDER BY or GROUP BY clause.
** This routine checks to see if pE is a simple identifier which corresponds
** to the AS-name of one of the terms of the expression list.  If it is,
** this routine return an integer between 1 and N where N is the number of
** elements in pEList, corresponding to the matching entry.  If there is
** no match, or if pE is not a simple identifier, then this routine
** return 0.
**
** pEList has been resolved.  pE has not.
*/
static int resolveAsName(
  Parse *pParse,     /* Parsing context for error messages */
  ExprList *pEList,  /* List of expressions to scan */
  Expr *pE           /* Expression we are trying to match */
){
  int i;             /* Loop counter */

  UNUSED_PARAMETER(pParse);

  if( pE->op==TK_ID ){
    char *zCol = pE->u.zToken;
    for(i=0; i<pEList->nExpr; i++){
      if( pEList->a[i].eEName==ENAME_NAME
       && sqlite3_stricmp(pEList->a[i].zEName, zCol)==0
      ){
        return i+1;
      }
    }
  }
  return 0;
}

/*
** pE is a pointer to an expression which is a single term in the
** ORDER BY of a compound SELECT.  The expression has not been
** name resolved.
**
** At the point this routine is called, we already know that the
** ORDER BY term is not an integer index into the result set.  That
** case is handled by the calling routine.
**
** Attempt to match pE against result set columns in the left-most
** SELECT statement.  Return the index i of the matching column,
** as an indication to the caller that it should sort by the i-th column.
** The left-most column is 1.  In other words, the value returned is the
** same integer value that would be used in the SQL statement to indicate
** the column.
**
** If there is no match, return 0.  Return -1 if an error occurs.
*/
static int resolveOrderByTermToExprList(
  Parse *pParse,     /* Parsing context for error messages */
  Select *pSelect,   /* The SELECT statement with the ORDER BY clause */
  Expr *pE           /* The specific ORDER BY term */
){
  int i;             /* Loop counter */
  ExprList *pEList;  /* The columns of the result set */
  NameContext nc;    /* Name context for resolving pE */
  sqlite3 *db;       /* Database connection */
  int rc;            /* Return code from subprocedures */
  u8 savedSuppErr;   /* Saved value of db->suppressErr */

  assert( sqlite3ExprIsInteger(pE, &i)==0 );
  pEList = pSelect->pEList;

  /* Resolve all names in the ORDER BY term expression
  */
  memset(&nc, 0, sizeof(nc));
  nc.pParse = pParse;
  nc.pSrcList = pSelect->pSrc;
  nc.uNC.pEList = pEList;
  nc.ncFlags = NC_AllowAgg|NC_UEList;
  nc.nErr = 0;
  db = pParse->db;
  savedSuppErr = db->suppressErr;
  if( IN_RENAME_OBJECT==0 ) db->suppressErr = 1;
  rc = sqlite3ResolveExprNames(&nc, pE);
  db->suppressErr = savedSuppErr;
  if( rc ) return 0;

  /* Try to match the ORDER BY expression against an expression
  ** in the result set.  Return an 1-based index of the matching
  ** result-set entry.
  */
  for(i=0; i<pEList->nExpr; i++){
    if( sqlite3ExprCompare(0, pEList->a[i].pExpr, pE, -1)<2 ){
      return i+1;
    }
  }

  /* If no match, return 0. */
  return 0;
}

/*
** Generate an ORDER BY or GROUP BY term out-of-range error.
*/
static void resolveOutOfRangeError(
  Parse *pParse,         /* The error context into which to write the error */
  const char *zType,     /* "ORDER" or "GROUP" */
  int i,                 /* The index (1-based) of the term out of range */
  int mx                 /* Largest permissible value of i */
){
  sqlite3ErrorMsg(pParse, 
    "%r %s BY term out of range - should be "
    "between 1 and %d", i, zType, mx);
}

/*
** Analyze the ORDER BY clause in a compound SELECT statement.   Modify
** each term of the ORDER BY clause is a constant integer between 1
** and N where N is the number of columns in the compound SELECT.
**
** ORDER BY terms that are already an integer between 1 and N are
** unmodified.  ORDER BY terms that are integers outside the range of
** 1 through N generate an error.  ORDER BY terms that are expressions
** are matched against result set expressions of compound SELECT
** beginning with the left-most SELECT and working toward the right.
** At the first match, the ORDER BY expression is transformed into
** the integer column number.
**
** Return the number of errors seen.
*/
static int resolveCompoundOrderBy(
  Parse *pParse,        /* Parsing context.  Leave error messages here */
  Select *pSelect       /* The SELECT statement containing the ORDER BY */
){
  int i;
  ExprList *pOrderBy;
  ExprList *pEList;
  sqlite3 *db;
  int moreToDo = 1;

  pOrderBy = pSelect->pOrderBy;
  if( pOrderBy==0 ) return 0;
  db = pParse->db;
  if( pOrderBy->nExpr>db->aLimit[SQLITE_LIMIT_COLUMN] ){
    sqlite3ErrorMsg(pParse, "too many terms in ORDER BY clause");
    return 1;
  }
  for(i=0; i<pOrderBy->nExpr; i++){
    pOrderBy->a[i].done = 0;
  }
  pSelect->pNext = 0;
  while( pSelect->pPrior ){
    pSelect->pPrior->pNext = pSelect;
    pSelect = pSelect->pPrior;
  }
  while( pSelect && moreToDo ){
    struct ExprList_item *pItem;
    moreToDo = 0;
    pEList = pSelect->pEList;
    assert( pEList!=0 );
    for(i=0, pItem=pOrderBy->a; i<pOrderBy->nExpr; i++, pItem++){
      int iCol = -1;
      Expr *pE, *pDup;
      if( pItem->done ) continue;
      pE = sqlite3ExprSkipCollateAndLikely(pItem->pExpr);
      if( sqlite3ExprIsInteger(pE, &iCol) ){
        if( iCol<=0 || iCol>pEList->nExpr ){
          resolveOutOfRangeError(pParse, "ORDER", i+1, pEList->nExpr);
          return 1;
        }
      }else{
        iCol = resolveAsName(pParse, pEList, pE);
        if( iCol==0 ){
          /* Now test if expression pE matches one of the values returned
          ** by pSelect. In the usual case this is done by duplicating the 
          ** expression, resolving any symbols in it, and then comparing
          ** it against each expression returned by the SELECT statement.
          ** Once the comparisons are finished, the duplicate expression
          ** is deleted.
          **
          ** Or, if this is running as part of an ALTER TABLE operation,
          ** resolve the symbols in the actual expression, not a duplicate.
          ** And, if one of the comparisons is successful, leave the expression
          ** as is instead of transforming it to an integer as in the usual
          ** case. This allows the code in alter.c to modify column
          ** refererences within the ORDER BY expression as required.  */
          if( IN_RENAME_OBJECT ){
            pDup = pE;
          }else{
            pDup = sqlite3ExprDup(db, pE, 0);
          }
          if( !db->mallocFailed ){
            assert(pDup);
            iCol = resolveOrderByTermToExprList(pParse, pSelect, pDup);
          }
          if( !IN_RENAME_OBJECT ){
            sqlite3ExprDelete(db, pDup);
          }
        }
      }
      if( iCol>0 ){
        /* Convert the ORDER BY term into an integer column number iCol,
        ** taking care to preserve the COLLATE clause if it exists */
        if( !IN_RENAME_OBJECT ){
          Expr *pNew = sqlite3Expr(db, TK_INTEGER, 0);
          if( pNew==0 ) return 1;
          pNew->flags |= EP_IntValue;
          pNew->u.iValue = iCol;
          if( pItem->pExpr==pE ){
            pItem->pExpr = pNew;
          }else{
            Expr *pParent = pItem->pExpr;
            assert( pParent->op==TK_COLLATE );
            while( pParent->pLeft->op==TK_COLLATE ) pParent = pParent->pLeft;
            assert( pParent->pLeft==pE );
            pParent->pLeft = pNew;
          }
          sqlite3ExprDelete(db, pE);
          pItem->u.x.iOrderByCol = (u16)iCol;
        }
        pItem->done = 1;
      }else{
        moreToDo = 1;
      }
    }
    pSelect = pSelect->pNext;
  }
  for(i=0; i<pOrderBy->nExpr; i++){
    if( pOrderBy->a[i].done==0 ){
      sqlite3ErrorMsg(pParse, "%r ORDER BY term does not match any "
            "column in the result set", i+1);
      return 1;
    }
  }
  return 0;
}

/*
** Check every term in the ORDER BY or GROUP BY clause pOrderBy of
** the SELECT statement pSelect.  If any term is reference to a
** result set expression (as determined by the ExprList.a.u.x.iOrderByCol
** field) then convert that term into a copy of the corresponding result set
** column.
**
** If any errors are detected, add an error message to pParse and
** return non-zero.  Return zero if no errors are seen.
*/
int sqlite3ResolveOrderGroupBy(
  Parse *pParse,        /* Parsing context.  Leave error messages here */
  Select *pSelect,      /* The SELECT statement containing the clause */
  ExprList *pOrderBy,   /* The ORDER BY or GROUP BY clause to be processed */
  const char *zType     /* "ORDER" or "GROUP" */
){
  int i;
  sqlite3 *db = pParse->db;
  ExprList *pEList;
  struct ExprList_item *pItem;

  if( pOrderBy==0 || pParse->db->mallocFailed || IN_RENAME_OBJECT ) return 0;
  if( pOrderBy->nExpr>db->aLimit[SQLITE_LIMIT_COLUMN] ){
    sqlite3ErrorMsg(pParse, "too many terms in %s BY clause", zType);
    return 1;
  }
  pEList = pSelect->pEList;
  assert( pEList!=0 );  /* sqlite3SelectNew() guarantees this */
  for(i=0, pItem=pOrderBy->a; i<pOrderBy->nExpr; i++, pItem++){
    if( pItem->u.x.iOrderByCol ){
      if( pItem->u.x.iOrderByCol>pEList->nExpr ){
        resolveOutOfRangeError(pParse, zType, i+1, pEList->nExpr);
        return 1;
      }
      resolveAlias(pParse, pEList, pItem->u.x.iOrderByCol-1, pItem->pExpr,
                   zType,0);
    }
  }
  return 0;
}

#ifndef SQLITE_OMIT_WINDOWFUNC
/*
** Walker callback for windowRemoveExprFromSelect().
*/
static int resolveRemoveWindowsCb(Walker *pWalker, Expr *pExpr){
  UNUSED_PARAMETER(pWalker);
  if( ExprHasProperty(pExpr, EP_WinFunc) ){
    Window *pWin = pExpr->y.pWin;
    sqlite3WindowUnlinkFromSelect(pWin);
  }
  return WRC_Continue;
}

/*
** Remove any Window objects owned by the expression pExpr from the
** Select.pWin list of Select object pSelect.
*/
static void windowRemoveExprFromSelect(Select *pSelect, Expr *pExpr){
  if( pSelect->pWin ){
    Walker sWalker;
    memset(&sWalker, 0, sizeof(Walker));
    sWalker.xExprCallback = resolveRemoveWindowsCb;
    sWalker.u.pSelect = pSelect;
    sqlite3WalkExpr(&sWalker, pExpr);
  }
}
#else
# define windowRemoveExprFromSelect(a, b)
#endif /* SQLITE_OMIT_WINDOWFUNC */

/*
** pOrderBy is an ORDER BY or GROUP BY clause in SELECT statement pSelect.
** The Name context of the SELECT statement is pNC.  zType is either
** "ORDER" or "GROUP" depending on which type of clause pOrderBy is.
**
** This routine resolves each term of the clause into an expression.
** If the order-by term is an integer I between 1 and N (where N is the
** number of columns in the result set of the SELECT) then the expression
** in the resolution is a copy of the I-th result-set expression.  If
** the order-by term is an identifier that corresponds to the AS-name of
** a result-set expression, then the term resolves to a copy of the
** result-set expression.  Otherwise, the expression is resolved in
** the usual way - using sqlite3ResolveExprNames().
**
** This routine returns the number of errors.  If errors occur, then
** an appropriate error message might be left in pParse.  (OOM errors
** excepted.)
*/
static int resolveOrderGroupBy(
  NameContext *pNC,     /* The name context of the SELECT statement */
  Select *pSelect,      /* The SELECT statement holding pOrderBy */
  ExprList *pOrderBy,   /* An ORDER BY or GROUP BY clause to resolve */
  const char *zType     /* Either "ORDER" or "GROUP", as appropriate */
){
  int i, j;                      /* Loop counters */
  int iCol;                      /* Column number */
  struct ExprList_item *pItem;   /* A term of the ORDER BY clause */
  Parse *pParse;                 /* Parsing context */
  int nResult;                   /* Number of terms in the result set */

  if( pOrderBy==0 ) return 0;
  nResult = pSelect->pEList->nExpr;
  pParse = pNC->pParse;
  for(i=0, pItem=pOrderBy->a; i<pOrderBy->nExpr; i++, pItem++){
    Expr *pE = pItem->pExpr;
    Expr *pE2 = sqlite3ExprSkipCollateAndLikely(pE);
    if( zType[0]!='G' ){
      iCol = resolveAsName(pParse, pSelect->pEList, pE2);
      if( iCol>0 ){
        /* If an AS-name match is found, mark this ORDER BY column as being
        ** a copy of the iCol-th result-set column.  The subsequent call to
        ** sqlite3ResolveOrderGroupBy() will convert the expression to a
        ** copy of the iCol-th result-set expression. */
        pItem->u.x.iOrderByCol = (u16)iCol;
        continue;
      }
    }
    if( sqlite3ExprIsInteger(pE2, &iCol) ){
      /* The ORDER BY term is an integer constant.  Again, set the column
      ** number so that sqlite3ResolveOrderGroupBy() will convert the
      ** order-by term to a copy of the result-set expression */
      if( iCol<1 || iCol>0xffff ){
        resolveOutOfRangeError(pParse, zType, i+1, nResult);
        return 1;
      }
      pItem->u.x.iOrderByCol = (u16)iCol;
      continue;
    }

    /* Otherwise, treat the ORDER BY term as an ordinary expression */
    pItem->u.x.iOrderByCol = 0;
    if( sqlite3ResolveExprNames(pNC, pE) ){
      return 1;
    }
    for(j=0; j<pSelect->pEList->nExpr; j++){
      if( sqlite3ExprCompare(0, pE, pSelect->pEList->a[j].pExpr, -1)==0 ){
        /* Since this expresion is being changed into a reference
        ** to an identical expression in the result set, remove all Window
        ** objects belonging to the expression from the Select.pWin list. */
        windowRemoveExprFromSelect(pSelect, pE);
        pItem->u.x.iOrderByCol = j+1;
      }
    }
  }
  return sqlite3ResolveOrderGroupBy(pParse, pSelect, pOrderBy, zType);
}

/*
** Resolve names in the SELECT statement p and all of its descendants.
*/
static int resolveSelectStep(Walker *pWalker, Select *p){
  NameContext *pOuterNC;  /* Context that contains this SELECT */
  NameContext sNC;        /* Name context of this SELECT */
  int isCompound;         /* True if p is a compound select */
  int nCompound;          /* Number of compound terms processed so far */
  Parse *pParse;          /* Parsing context */
  int i;                  /* Loop counter */
  ExprList *pGroupBy;     /* The GROUP BY clause */
  Select *pLeftmost;      /* Left-most of SELECT of a compound */
  sqlite3 *db;            /* Database connection */
  

  assert( p!=0 );
  if( p->selFlags & SF_Resolved ){
    return WRC_Prune;
  }
  pOuterNC = pWalker->u.pNC;
  pParse = pWalker->pParse;
  db = pParse->db;

  /* Normally sqlite3SelectExpand() will be called first and will have
  ** already expanded this SELECT.  However, if this is a subquery within
  ** an expression, sqlite3ResolveExprNames() will be called without a
  ** prior call to sqlite3SelectExpand().  When that happens, let
  ** sqlite3SelectPrep() do all of the processing for this SELECT.
  ** sqlite3SelectPrep() will invoke both sqlite3SelectExpand() and
  ** this routine in the correct order.
  */
  if( (p->selFlags & SF_Expanded)==0 ){
    sqlite3SelectPrep(pParse, p, pOuterNC);
    return (pParse->nErr || db->mallocFailed) ? WRC_Abort : WRC_Prune;
  }

  isCompound = p->pPrior!=0;
  nCompound = 0;
  pLeftmost = p;
  while( p ){
    assert( (p->selFlags & SF_Expanded)!=0 );
    assert( (p->selFlags & SF_Resolved)==0 );
    p->selFlags |= SF_Resolved;

    /* Resolve the expressions in the LIMIT and OFFSET clauses. These
    ** are not allowed to refer to any names, so pass an empty NameContext.
    */
    memset(&sNC, 0, sizeof(sNC));
    sNC.pParse = pParse;
    sNC.pWinSelect = p;
    if( sqlite3ResolveExprNames(&sNC, p->pLimit) ){
      return WRC_Abort;
    }

    /* If the SF_Converted flags is set, then this Select object was
    ** was created by the convertCompoundSelectToSubquery() function.
    ** In this case the ORDER BY clause (p->pOrderBy) should be resolved
    ** as if it were part of the sub-query, not the parent. This block
    ** moves the pOrderBy down to the sub-query. It will be moved back
    ** after the names have been resolved.  */
    if( p->selFlags & SF_Converted ){
      Select *pSub = p->pSrc->a[0].pSelect;
      assert( p->pSrc->nSrc==1 && p->pOrderBy );
      assert( pSub->pPrior && pSub->pOrderBy==0 );
      pSub->pOrderBy = p->pOrderBy;
      p->pOrderBy = 0;
    }
  
    /* Recursively resolve names in all subqueries
    */
    for(i=0; i<p->pSrc->nSrc; i++){
      struct SrcList_item *pItem = &p->pSrc->a[i];
      if( pItem->pSelect && (pItem->pSelect->selFlags & SF_Resolved)==0 ){
        NameContext *pNC;         /* Used to iterate name contexts */
        int nRef = 0;             /* Refcount for pOuterNC and outer contexts */
        const char *zSavedContext = pParse->zAuthContext;

        /* Count the total number of references to pOuterNC and all of its
        ** parent contexts. After resolving references to expressions in
        ** pItem->pSelect, check if this value has changed. If so, then
        ** SELECT statement pItem->pSelect must be correlated. Set the
        ** pItem->fg.isCorrelated flag if this is the case. */
        for(pNC=pOuterNC; pNC; pNC=pNC->pNext) nRef += pNC->nRef;

        if( pItem->zName ) pParse->zAuthContext = pItem->zName;
        sqlite3ResolveSelectNames(pParse, pItem->pSelect, pOuterNC);
        pParse->zAuthContext = zSavedContext;
        if( pParse->nErr || db->mallocFailed ) return WRC_Abort;

        for(pNC=pOuterNC; pNC; pNC=pNC->pNext) nRef -= pNC->nRef;
        assert( pItem->fg.isCorrelated==0 && nRef<=0 );
        pItem->fg.isCorrelated = (nRef!=0);
      }
    }
  
    /* Set up the local name-context to pass to sqlite3ResolveExprNames() to
    ** resolve the result-set expression list.
    */
    sNC.ncFlags = NC_AllowAgg|NC_AllowWin;
    sNC.pSrcList = p->pSrc;
    sNC.pNext = pOuterNC;
  
    /* Resolve names in the result set. */
    if( sqlite3ResolveExprListNames(&sNC, p->pEList) ) return WRC_Abort;
    sNC.ncFlags &= ~NC_AllowWin;
  
    /* If there are no aggregate functions in the result-set, and no GROUP BY 
    ** expression, do not allow aggregates in any of the other expressions.
    */
    assert( (p->selFlags & SF_Aggregate)==0 );
    pGroupBy = p->pGroupBy;
    if( pGroupBy || (sNC.ncFlags & NC_HasAgg)!=0 ){
      assert( NC_MinMaxAgg==SF_MinMaxAgg );
      p->selFlags |= SF_Aggregate | (sNC.ncFlags&NC_MinMaxAgg);
    }else{
      sNC.ncFlags &= ~NC_AllowAgg;
    }
  
    /* If a HAVING clause is present, then there must be a GROUP BY clause.
    */
    if( p->pHaving && !pGroupBy ){
      sqlite3ErrorMsg(pParse, "a GROUP BY clause is required before HAVING");
      return WRC_Abort;
    }
  
    /* Add the output column list to the name-context before parsing the
    ** other expressions in the SELECT statement. This is so that
    ** expressions in the WHERE clause (etc.) can refer to expressions by
    ** aliases in the result set.
    **
    ** Minor point: If this is the case, then the expression will be
    ** re-evaluated for each reference to it.
    */
    assert( (sNC.ncFlags & (NC_UAggInfo|NC_UUpsert))==0 );
    sNC.uNC.pEList = p->pEList;
    sNC.ncFlags |= NC_UEList;
    if( sqlite3ResolveExprNames(&sNC, p->pHaving) ) return WRC_Abort;
    if( sqlite3ResolveExprNames(&sNC, p->pWhere) ) return WRC_Abort;

    /* Resolve names in table-valued-function arguments */
    for(i=0; i<p->pSrc->nSrc; i++){
      struct SrcList_item *pItem = &p->pSrc->a[i];
      if( pItem->fg.isTabFunc
       && sqlite3ResolveExprListNames(&sNC, pItem->u1.pFuncArg) 
      ){
        return WRC_Abort;
      }
    }

    /* The ORDER BY and GROUP BY clauses may not refer to terms in
    ** outer queries 
    */
    sNC.pNext = 0;
    sNC.ncFlags |= NC_AllowAgg|NC_AllowWin;

    /* If this is a converted compound query, move the ORDER BY clause from 
    ** the sub-query back to the parent query. At this point each term
    ** within the ORDER BY clause has been transformed to an integer value.
    ** These integers will be replaced by copies of the corresponding result
    ** set expressions by the call to resolveOrderGroupBy() below.  */
    if( p->selFlags & SF_Converted ){
      Select *pSub = p->pSrc->a[0].pSelect;
      p->pOrderBy = pSub->pOrderBy;
      pSub->pOrderBy = 0;
    }

    /* Process the ORDER BY clause for singleton SELECT statements.
    ** The ORDER BY clause for compounds SELECT statements is handled
    ** below, after all of the result-sets for all of the elements of
    ** the compound have been resolved.
    **
    ** If there is an ORDER BY clause on a term of a compound-select other
    ** than the right-most term, then that is a syntax error.  But the error
    ** is not detected until much later, and so we need to go ahead and
    ** resolve those symbols on the incorrect ORDER BY for consistency.
    */
    if( isCompound<=nCompound  /* Defer right-most ORDER BY of a compound */
     && resolveOrderGroupBy(&sNC, p, p->pOrderBy, "ORDER")
    ){
      return WRC_Abort;
    }
    if( db->mallocFailed ){
      return WRC_Abort;
    }
    sNC.ncFlags &= ~NC_AllowWin;
  
    /* Resolve the GROUP BY clause.  At the same time, make sure 
    ** the GROUP BY clause does not contain aggregate functions.
    */
    if( pGroupBy ){
      struct ExprList_item *pItem;
    
      if( resolveOrderGroupBy(&sNC, p, pGroupBy, "GROUP") || db->mallocFailed ){
        return WRC_Abort;
      }
      for(i=0, pItem=pGroupBy->a; i<pGroupBy->nExpr; i++, pItem++){
        if( ExprHasProperty(pItem->pExpr, EP_Agg) ){
          sqlite3ErrorMsg(pParse, "aggregate functions are not allowed in "
              "the GROUP BY clause");
          return WRC_Abort;
        }
      }
    }

#ifndef SQLITE_OMIT_WINDOWFUNC
    if( IN_RENAME_OBJECT ){
      Window *pWin;
      for(pWin=p->pWinDefn; pWin; pWin=pWin->pNextWin){
        if( sqlite3ResolveExprListNames(&sNC, pWin->pOrderBy)
         || sqlite3ResolveExprListNames(&sNC, pWin->pPartition)
        ){
          return WRC_Abort;
        }
      }
    }
#endif

    /* If this is part of a compound SELECT, check that it has the right
    ** number of expressions in the select list. */
    if( p->pNext && p->pEList->nExpr!=p->pNext->pEList->nExpr ){
      sqlite3SelectWrongNumTermsError(pParse, p->pNext);
      return WRC_Abort;
    }

    /* Advance to the next term of the compound
    */
    p = p->pPrior;
    nCompound++;
  }

  /* Resolve the ORDER BY on a compound SELECT after all terms of
  ** the compound have been resolved.
  */
  if( isCompound && resolveCompoundOrderBy(pParse, pLeftmost) ){
    return WRC_Abort;
  }

  return WRC_Prune;
}

/*
** This routine walks an expression tree and resolves references to
** table columns and result-set columns.  At the same time, do error
** checking on function usage and set a flag if any aggregate functions
** are seen.
**
** To resolve table columns references we look for nodes (or subtrees) of the 
** form X.Y.Z or Y.Z or just Z where
**
**      X:   The name of a database.  Ex:  "main" or "temp" or
**           the symbolic name assigned to an ATTACH-ed database.
**
**      Y:   The name of a table in a FROM clause.  Or in a trigger
**           one of the special names "old" or "new".
**
**      Z:   The name of a column in table Y.
**
** The node at the root of the subtree is modified as follows:
**
**    Expr.op        Changed to TK_COLUMN
**    Expr.pTab      Points to the Table object for X.Y
**    Expr.iColumn   The column index in X.Y.  -1 for the rowid.
**    Expr.iTable    The VDBE cursor number for X.Y
**
**
** To resolve result-set references, look for expression nodes of the
** form Z (with no X and Y prefix) where the Z matches the right-hand
** size of an AS clause in the result-set of a SELECT.  The Z expression
** is replaced by a copy of the left-hand side of the result-set expression.
** Table-name and function resolution occurs on the substituted expression
** tree.  For example, in:
**
**      SELECT a+b AS x, c+d AS y FROM t1 ORDER BY x;
**
** The "x" term of the order by is replaced by "a+b" to render:
**
**      SELECT a+b AS x, c+d AS y FROM t1 ORDER BY a+b;
**
** Function calls are checked to make sure that the function is 
** defined and that the correct number of arguments are specified.
** If the function is an aggregate function, then the NC_HasAgg flag is
** set and the opcode is changed from TK_FUNCTION to TK_AGG_FUNCTION.
** If an expression contains aggregate functions then the EP_Agg
** property on the expression is set.
**
** An error message is left in pParse if anything is amiss.  The number
** if errors is returned.
*/
int sqlite3ResolveExprNames( 
  NameContext *pNC,       /* Namespace to resolve expressions in. */
  Expr *pExpr             /* The expression to be analyzed. */
){
  int savedHasAgg;
  Walker w;

  if( pExpr==0 ) return SQLITE_OK;
  savedHasAgg = pNC->ncFlags & (NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
  pNC->ncFlags &= ~(NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
  w.pParse = pNC->pParse;
  w.xExprCallback = resolveExprStep;
  w.xSelectCallback = resolveSelectStep;
  w.xSelectCallback2 = 0;
  w.u.pNC = pNC;
#if SQLITE_MAX_EXPR_DEPTH>0
  w.pParse->nHeight += pExpr->nHeight;
  if( sqlite3ExprCheckHeight(w.pParse, w.pParse->nHeight) ){
    return SQLITE_ERROR;
  }
#endif
  sqlite3WalkExpr(&w, pExpr);
#if SQLITE_MAX_EXPR_DEPTH>0
  w.pParse->nHeight -= pExpr->nHeight;
#endif
  assert( EP_Agg==NC_HasAgg );
  assert( EP_Win==NC_HasWin );
  testcase( pNC->ncFlags & NC_HasAgg );
  testcase( pNC->ncFlags & NC_HasWin );
  ExprSetProperty(pExpr, pNC->ncFlags & (NC_HasAgg|NC_HasWin) );
  pNC->ncFlags |= savedHasAgg;
  return pNC->nErr>0 || w.pParse->nErr>0;
}

/*
** Resolve all names for all expression in an expression list.  This is
** just like sqlite3ResolveExprNames() except that it works for an expression
** list rather than a single expression.
*/
int sqlite3ResolveExprListNames( 
  NameContext *pNC,       /* Namespace to resolve expressions in. */
  ExprList *pList         /* The expression list to be analyzed. */
){
  int i;
  int savedHasAgg = 0;
  Walker w;
  if( pList==0 ) return WRC_Continue;
  w.pParse = pNC->pParse;
  w.xExprCallback = resolveExprStep;
  w.xSelectCallback = resolveSelectStep;
  w.xSelectCallback2 = 0;
  w.u.pNC = pNC;
  savedHasAgg = pNC->ncFlags & (NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
  pNC->ncFlags &= ~(NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
  for(i=0; i<pList->nExpr; i++){
    Expr *pExpr = pList->a[i].pExpr;
    if( pExpr==0 ) continue;
#if SQLITE_MAX_EXPR_DEPTH>0
    w.pParse->nHeight += pExpr->nHeight;
    if( sqlite3ExprCheckHeight(w.pParse, w.pParse->nHeight) ){
      return WRC_Abort;
    }
#endif
    sqlite3WalkExpr(&w, pExpr);
#if SQLITE_MAX_EXPR_DEPTH>0
    w.pParse->nHeight -= pExpr->nHeight;
#endif
    assert( EP_Agg==NC_HasAgg );
    assert( EP_Win==NC_HasWin );
    testcase( pNC->ncFlags & NC_HasAgg );
    testcase( pNC->ncFlags & NC_HasWin );
    if( pNC->ncFlags & (NC_HasAgg|NC_MinMaxAgg|NC_HasWin) ){
      ExprSetProperty(pExpr, pNC->ncFlags & (NC_HasAgg|NC_HasWin) );
      savedHasAgg |= pNC->ncFlags & (NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
      pNC->ncFlags &= ~(NC_HasAgg|NC_MinMaxAgg|NC_HasWin);
    }
    if( pNC->nErr>0 || w.pParse->nErr>0 ) return WRC_Abort;
  }
  pNC->ncFlags |= savedHasAgg;
  return WRC_Continue;
}

/*
** Resolve all names in all expressions of a SELECT and in all
** decendents of the SELECT, including compounds off of p->pPrior,
** subqueries in expressions, and subqueries used as FROM clause
** terms.
**
** See sqlite3ResolveExprNames() for a description of the kinds of
** transformations that occur.
**
** All SELECT statements should have been expanded using
** sqlite3SelectExpand() prior to invoking this routine.
*/
void sqlite3ResolveSelectNames(
  Parse *pParse,         /* The parser context */
  Select *p,             /* The SELECT statement being coded. */
  NameContext *pOuterNC  /* Name context for parent SELECT statement */
){
  Walker w;

  assert( p!=0 );
  w.xExprCallback = resolveExprStep;
  w.xSelectCallback = resolveSelectStep;
  w.xSelectCallback2 = 0;
  w.pParse = pParse;
  w.u.pNC = pOuterNC;
  sqlite3WalkSelect(&w, p);
}

/*
** Resolve names in expressions that can only reference a single table
** or which cannot reference any tables at all.  Examples:
**
**                                                    "type" flag
**                                                    ------------
**    (1)   CHECK constraints                         NC_IsCheck
**    (2)   WHERE clauses on partial indices          NC_PartIdx
**    (3)   Expressions in indexes on expressions     NC_IdxExpr
**    (4)   Expression arguments to VACUUM INTO.      0
**    (5)   GENERATED ALWAYS as expressions           NC_GenCol
**
** In all cases except (4), the Expr.iTable value for Expr.op==TK_COLUMN
** nodes of the expression is set to -1 and the Expr.iColumn value is
** set to the column number.  In case (4), TK_COLUMN nodes cause an error.
**
** Any errors cause an error message to be set in pParse.
*/
int sqlite3ResolveSelfReference(
  Parse *pParse,   /* Parsing context */
  Table *pTab,     /* The table being referenced, or NULL */
  int type,        /* NC_IsCheck, NC_PartIdx, NC_IdxExpr, NC_GenCol, or 0 */
  Expr *pExpr,     /* Expression to resolve.  May be NULL. */
  ExprList *pList  /* Expression list to resolve.  May be NULL. */
){
  SrcList sSrc;                   /* Fake SrcList for pParse->pNewTable */
  NameContext sNC;                /* Name context for pParse->pNewTable */
  int rc;

  assert( type==0 || pTab!=0 );
  assert( type==NC_IsCheck || type==NC_PartIdx || type==NC_IdxExpr
          || type==NC_GenCol || pTab==0 );
  memset(&sNC, 0, sizeof(sNC));
  memset(&sSrc, 0, sizeof(sSrc));
  if( pTab ){
    sSrc.nSrc = 1;
    sSrc.a[0].zName = pTab->zName;
    sSrc.a[0].pTab = pTab;
    sSrc.a[0].iCursor = -1;
    if( pTab->pSchema!=pParse->db->aDb[1].pSchema ){
      /* Cause EP_FromDDL to be set on TK_FUNCTION nodes of non-TEMP
      ** schema elements */
      type |= NC_FromDDL;
    }
  }
  sNC.pParse = pParse;
  sNC.pSrcList = &sSrc;
  sNC.ncFlags = type | NC_IsDDL;
  if( (rc = sqlite3ResolveExprNames(&sNC, pExpr))!=SQLITE_OK ) return rc;
  if( pList ) rc = sqlite3ResolveExprListNames(&sNC, pList);
  return rc;
}
