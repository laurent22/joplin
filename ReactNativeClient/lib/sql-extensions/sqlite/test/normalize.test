# 2018-01-08
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Tests for the sqlite3_normalize() extension function.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix normalize

foreach {tnum sql norm} {
  100
  {SELECT * FROM t1 WHERE a IN (1) AND b=51.42}
  {select*from t1 where a in(?,?,?)and b=?;}

  110
  {SELECT a, b+15, c FROM t1 WHERE d NOT IN (SELECT x FROM t2);}
  {select a,b+?,c from t1 where d not in(select x from t2);}

  120
  { SELECT NULL, b FROM t1 -- comment text
     WHERE d IN (WITH t(a) AS (VALUES(5)) /* CTE */
                 SELECT a FROM t)
        OR e='hello';
  }
  {select?,b from t1 where d in(with t(a)as(values(?))select a from t)or e=?;}

  121
  {/*Initial comment*/
   -- another comment line
   SELECT NULL  /* comment */ , b FROM t1 -- comment text
     WHERE d IN (WITH t(a) AS (VALUES(5)) /* CTE */
                 SELECT a FROM t)
        OR e='hello';
  }
  {select?,b from t1 where d in(with t(a)as(values(?))select a from t)or e=?;}

  130
  {/* Query containing parameters */
   SELECT x,$::abc(15),y,@abc,z,?99,w FROM t1 /* Trailing comment */}
  {select x,?,y,?,z,?,w from t1;}

  140
  {/* Long list on the RHS of IN */
   SELECT 15 IN (1,2,3,(SELECT * FROM t1),'xyz',x'abcd',22*(x+5),null);}
  {select?in(?,?,?);}

  150
  {SELECT x'abc'; -- illegal token}
  {}

  160
  {SELECT a,NULL,b FROM t1 WHERE c IS NOT NULL or D is null or e=5}
  {select a,?,b from t1 where c is not null or d is null or e=?;}

  170
  {/* IN list exactly 5 bytes long */
   SELECT * FROM t1 WHERE x IN (1,2,3);}
  {select*from t1 where x in(?,?,?);}
  180
  {    }
  {}
} {
  do_test $tnum [list sqlite3_normalize $sql] $norm
}

ifcapable normalize {
do_test 200 {
  execsql {
    CREATE TABLE t1(a,b);
  }
} {}
do_test 201 {
  set STMT [sqlite3_prepare_v3 $DB \
      "SELECT a, b FROM t1 WHERE b = ? ORDER BY a;" -1 0 TAIL]

  sqlite3_bind_null $STMT 1
} {}
do_test 202 {
  sqlite3_normalized_sql $STMT
} {SELECT a,b FROM t1 WHERE b=?ORDER BY a;}
do_test 203 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 210 {
  set STMT [sqlite3_prepare_v3 $DB \
      "SELECT a, b FROM t1 WHERE b = ? ORDER BY a;" -1 2 TAIL]

  sqlite3_bind_null $STMT 1
} {}
do_test 211 {
  sqlite3_normalized_sql $STMT
} {SELECT a,b FROM t1 WHERE b=?ORDER BY a;}
do_test 212 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 220 {
  set STMT [sqlite3_prepare_v3 $DB \
      "SELECT a, b FROM t1 WHERE b = 'a' ORDER BY a;" -1 2 TAIL]
} {/^[0-9A-Fa-f]+$/}
do_test 221 {
  sqlite3_normalized_sql $STMT
} {SELECT a,b FROM t1 WHERE b=?ORDER BY a;}
do_test 222 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 297 {
  execsql {
    DROP TABLE t1;
  }
} {}
do_test 298 {
  execsql {
    CREATE TABLE t1(a,b,c,d,e,"col f",w,x,y,z);
    CREATE TABLE t2(x,"col y");
  }
} {}
do_test 299 {
  sqlite3_create_function db
} {SQLITE_OK}

foreach {tnum sql flags norm} {
  300
  {SELECT * FROM t1 WHERE a IN (1) AND b=51.42}
  0x2
  {0 {SELECT*FROM t1 WHERE a IN(?,?,?)AND b=?;}}

  310
  {SELECT a, b+15, c FROM t1 WHERE d NOT IN (SELECT x FROM t2);}
  0x2
  {0 {SELECT a,b+?,c FROM t1 WHERE d NOT IN(SELECT x FROM t2);}}

  320
  { SELECT NULL, b FROM t1 -- comment text
     WHERE d IN (WITH t(a) AS (VALUES(5)) /* CTE */
                 SELECT a FROM t)
        OR e='hello';
  }
  0x2
  {0 {SELECT?,b FROM t1 WHERE d IN(WITH t(a)AS(VALUES(?))SELECT a FROM t)OR e=?;}}

  321
  {/*Initial comment*/
   -- another comment line
   SELECT NULL  /* comment */ , b FROM t1 -- comment text
     WHERE d IN (WITH t(a) AS (VALUES(5)) /* CTE */
                 SELECT a FROM t)
        OR e='hello';
  }
  0x2
  {0 {SELECT?,b FROM t1 WHERE d IN(WITH t(a)AS(VALUES(?))SELECT a FROM t)OR e=?;}}

  330
  {/* Query containing parameters */
   SELECT x,$::abc(15),y,@abc,z,?99,w FROM t1 /* Trailing comment */}
  0x2
  {0 {SELECT x,?,y,?,z,?,w FROM t1;}}

  340
  {/* Long list on the RHS of IN */
   SELECT 15 IN (1,2,3,(SELECT * FROM t1),'xyz',x'abcd',22*(x+5),null);}
  0x2
  {1 {(1) no such column: x}}

  350
  {SELECT x'abc'; -- illegal token}
  0x2
  {1 {(1) unrecognized token: "x'abc'"}}

  360
  {SELECT a,NULL,b FROM t1 WHERE c IS NOT NULL or D is null or e=5}
  0x2
  {0 {SELECT a,?,b FROM t1 WHERE c IS NOT NULL OR d IS NULL OR e=?;}}

  370
  {/* IN list exactly 5 bytes long */
   SELECT * FROM t1 WHERE x IN (1,2,3);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(?,?,?);}}

  400
  {SELECT a FROM t1 WHERE x IN (1,2,3) AND sqlite_version();}
  0x2
  {0 {SELECT a FROM t1 WHERE x IN(?,?,?)AND sqlite_version();}}

  410
  {SELECT a FROM t1 WHERE x IN (1,2,3) AND hex8();}
  0x2
  {1 {(1) wrong number of arguments to function hex8()}}

  420
  {SELECT a FROM t1 WHERE x IN (1,2,3) AND hex8('abc');}
  0x2
  {0 {SELECT a FROM t1 WHERE x IN(?,?,?)AND hex8(?);}}

  430
  {SELECT "a" FROM t1 WHERE "x" IN ("1","2",'3');}
  0x2
  {0 {SELECT a FROM t1 WHERE x IN(?,?,?);}}

  440
  {SELECT 'a' FROM t1 WHERE 'x';}
  0x2
  {0 {SELECT?FROM t1 WHERE?;}}

  450
  {SELECT [a] FROM t1 WHERE [x];}
  0x2
  {0 {SELECT a FROM t1 WHERE x;}}

  460
  {SELECT * FROM t1 WHERE x IN (x);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(x);}}

  470
  {SELECT * FROM t1 WHERE x IN (x,a);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(x,a);}}

  480
  {SELECT * FROM t1 WHERE x IN ([x],"a");}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(x,a);}}

  500
  {SELECT * FROM t1 WHERE x IN ([x],"a",'b',sqlite_version());}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(x,a,?,sqlite_version());}}

  520
  {SELECT * FROM t1 WHERE x IN (SELECT x FROM t1);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(SELECT x FROM t1);}}

  540
  {SELECT * FROM t1 WHERE x IN ((SELECT x FROM t1));}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN((SELECT x FROM t1));}}

  550
  {SELECT a, a+1, a||'b', a+"b" FROM t1;}
  0x2
  {0 {SELECT a,a+?,a||?,a+b FROM t1;}}

  570
  {SELECT * FROM t1 WHERE x IN (1);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(?,?,?);}}

  580
  {SELECT * FROM t1 WHERE x IN (1,2);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(?,?,?);}}

  590
  {SELECT * FROM t1 WHERE x IN (1,2,3);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(?,?,?);}}

  600
  {SELECT * FROM t1 WHERE x IN (1,2,3,4);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(?,?,?);}}

  610
  {SELECT * FROM t1 WHERE x IN (SELECT x FROM t1);}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(SELECT x FROM t1);}}

  620
  {SELECT * FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (1,2,3));}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(?,?,?));}}

  630
  {SELECT * FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (x));}
  0x2
  {0 {SELECT*FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(x));}}

  640
  {SELECT x FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (
   SELECT x FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (
   SELECT x FROM t1 WHERE x IN (x)))));}
  0x2
  {0 {SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(x)))));}}

  650
  {SELECT x FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (
   SELECT x FROM t1 WHERE x IN (SELECT x FROM t1 WHERE x IN (
   SELECT x FROM t1 WHERE x IN (1)))));}
  0x2
  {0 {SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(SELECT x FROM t1 WHERE x IN(?,?,?)))));}}

  660
  {SELECT x FROM t1 WHERE x IN (1) UNION ALL SELECT x FROM t1 WHERE x IN (1);}
  0x2
  {0 {SELECT x FROM t1 WHERE x IN(?,?,?)UNION ALL SELECT x FROM t1 WHERE x IN(?,?,?);}}

  670
  {SELECT "col f", [col f] FROM t1;}
  0x2
  {0 {SELECT"col f","col f"FROM t1;}}

  680
  {SELECT a, "col f" FROM t1 LEFT OUTER JOIN t2 ON [t1].[col f] == [t2].[col y];}
  0x2
  {0 {SELECT a,"col f"FROM t1 LEFT OUTER JOIN t2 ON t1."col f"==t2."col y";}}

  690
  {SELECT * FROM ( WITH x AS ( SELECT * FROM t1 WHERE x IN ( 1)) SELECT 10);}
  0x2
  {0 {SELECT*FROM(WITH x AS(SELECT*FROM t1 WHERE x IN(?,?,?))SELECT?);}}

  700
  {SELECT rowid, oid, _rowid_ FROM t1;}
  0x2
  {0 {SELECT rowid,oid,_rowid_ FROM t1;}}

  710
  {SELECT x FROM t1 WHERE x IS NULL;}
  0x2
  {0 {SELECT x FROM t1 WHERE x IS NULL;}}

  740
  {SELECT x FROM t1 WHERE x IS NOT NULL;}
  0x2
  {0 {SELECT x FROM t1 WHERE x IS NOT NULL;}}

  750
  {SELECT x FROM t1 WHERE x = NULL;}
  0x2
  {0 {SELECT x FROM t1 WHERE x=?;}}

  760
  {SELECT x FROM t1 WHERE x IN ([x] IS NOT NULL, NULL, 1, 'a', "b", x'00');}
  0x2
  {0 {SELECT x FROM t1 WHERE x IN(x IS NOT NULL,?,?,?,b,?);}}

  800
  {ATTACH "normalize800.db" AS somefile;}
  0x2
  {0 {ATTACH"normalize800.db"AS somefile;}}

  810
  {ATTACH DATABASE "normalize810.db" AS somefile;}
  0x2
  {0 {ATTACH DATABASE"normalize810.db"AS somefile;}}

  900
  {INSERT INTO t1 (x) VALUES("sl1"), (1), ("sl2"), ('i');}
  0x2
  {0 {INSERT INTO t1(x)VALUES(?),(?),(?),(?);}}

  910
  {UPDATE t1 SET x = "sl1" WHERE x IN (1, "sl2", 'i');}
  0x2
  {0 {UPDATE t1 SET x=?WHERE x IN(?,?,?);}}

  920
  {UPDATE t1 SET x = "y" WHERE x IN (1, "sl1", 'i');}
  0x2
  {0 {UPDATE t1 SET x=y WHERE x IN(?,?,?);}}

  930
  {DELETE FROM t1 WHERE x IN (1, "sl1", 'i');}
  0x2
  {0 {DELETE FROM t1 WHERE x IN(?,?,?);}}
} {
  do_test $tnum {
    set code [catch {
      set STMT [sqlite3_prepare_v3 $DB $sql -1 $flags TAIL]
      sqlite3_normalized_sql $STMT
    } res]
    if {[info exists STMT]} {
      sqlite3_finalize $STMT; unset STMT
    }
    list $code $res
  } $norm
}
}

finish_test
