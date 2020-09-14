# 2008 December 8
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file is a verification that the bugs identified in ticket
# #3527 have been fixed.
#
# $Id: tkt3527.test,v 1.1 2008/12/08 13:42:36 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt3527-1.1 {
  db eval {
    CREATE TABLE Element (
     Code INTEGER PRIMARY KEY,
     Name VARCHAR(60)
    );
    
    CREATE TABLE ElemOr (
     CodeOr INTEGER NOT NULL,
     Code INTEGER NOT NULL,
     PRIMARY KEY(CodeOr,Code)
    );
    
    CREATE TABLE ElemAnd (
     CodeAnd INTEGER,
     Code INTEGER,
     Attr1 INTEGER,
     Attr2 INTEGER,
     Attr3 INTEGER,
     PRIMARY KEY(CodeAnd,Code)
    );
    
    INSERT INTO Element VALUES(1,'Elem1');
    INSERT INTO Element VALUES(2,'Elem2');
    INSERT INTO Element VALUES(3,'Elem3');
    INSERT INTO Element VALUES(4,'Elem4');
    INSERT INTO Element VALUES(5,'Elem5');
    INSERT INTO ElemOr Values(3,4);
    INSERT INTO ElemOr Values(3,5);
    INSERT INTO ElemAnd VALUES(1,3,'a','b','c');
    INSERT INTO ElemAnd VALUES(1,2,'x','y','z');
    
    CREATE VIEW ElemView1 AS
    SELECT
      CAST(Element.Code AS VARCHAR(50)) AS ElemId,
     Element.Code AS ElemCode,
     Element.Name AS ElemName,
     ElemAnd.Code AS InnerCode,
     ElemAnd.Attr1 AS Attr1,
     ElemAnd.Attr2 AS Attr2,
     ElemAnd.Attr3 AS Attr3,
     0 AS Level,
     0 AS IsOrElem
    FROM Element JOIN ElemAnd ON ElemAnd.CodeAnd=Element.Code
    WHERE ElemAnd.CodeAnd NOT IN (SELECT CodeOr FROM ElemOr)
    UNION ALL
    SELECT
      CAST(ElemOr.CodeOr AS VARCHAR(50)) AS ElemId,
      Element.Code AS ElemCode,
      Element.Name AS ElemName,
      ElemOr.Code AS InnerCode,
      NULL AS Attr1,
      NULL AS Attr2,
      NULL AS Attr3,
      0 AS Level,
      1 AS IsOrElem
    FROM ElemOr JOIN Element ON Element.Code=ElemOr.CodeOr
    ORDER BY ElemId, InnerCode;
    
    CREATE VIEW ElemView2 AS
    SELECT
      ElemId,
      ElemCode,
      ElemName,
      InnerCode,
      Attr1,
      Attr2,
      Attr3,
      Level,
      IsOrElem
    FROM ElemView1
    UNION ALL
    SELECT
      Element.ElemId || '.' || InnerElem.ElemId AS ElemId,
      InnerElem.ElemCode,
      InnerElem.ElemName,
      InnerElem.InnerCode,
      InnerElem.Attr1,
      InnerElem.Attr2,
      InnerElem.Attr3,
      InnerElem.Level+1,
      InnerElem.IsOrElem
    FROM ElemView1 AS Element
    JOIN ElemView1 AS InnerElem
         ON Element.Level=0 AND Element.InnerCode=InnerElem.ElemCode
    ORDER BY ElemId, InnerCode;
 
    SELECT * FROM ElemView1;
  }
} {1 1 Elem1 2 x y z 0 0 1 1 Elem1 3 a b c 0 0 3 3 Elem3 4 {} {} {} 0 1 3 3 Elem3 5 {} {} {} 0 1}
   
do_test tkt3527-1.2 {
  db eval {
    SELECT * FROM ElemView2;
  }
} {1 1 Elem1 2 x y z 0 0 1 1 Elem1 3 a b c 0 0 1.3 3 Elem3 4 {} {} {} 1 1 1.3 3 Elem3 5 {} {} {} 1 1 3 3 Elem3 4 {} {} {} 0 1 3 3 Elem3 5 {} {} {} 0 1}

finish_test
