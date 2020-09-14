# 2013-04-13
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file tests features of the name resolver (the component that
# figures out what identifiers in the SQL statement refer to) that
# were fixed by ticket [2500cdb9be].
#
# See also tickets [1c69be2daf] and [f617ea3125] from 2013-08-14.
#
# Also a fuzzer-discovered problem on 2015-04-23.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# "ORDER BY y" binds to the output result-set column named "y"
# if available.  If no output column is named "y", then try to
# bind against an input column named "y".
#
# This is classical SQL92 behavior.
#
do_test resolver01-1.1 {
  catchsql {
    CREATE TABLE t1(x, y); INSERT INTO t1 VALUES(11,22);
    CREATE TABLE t2(y, z); INSERT INTO t2 VALUES(33,44);
    SELECT 1 AS y FROM t1, t2 ORDER BY y;
  }
} {0 1}
do_test resolver01-1.2 {
  catchsql {
    SELECT 1 AS yy FROM t1, t2 ORDER BY y;
  }
} {1 {ambiguous column name: y}}
do_test resolver01-1.3 {
  catchsql {
    CREATE TABLE t3(x,y); INSERT INTO t3 VALUES(11,44),(33,22);
    SELECT x AS y FROM t3 ORDER BY y;
  }
} {0 {11 33}}
do_test resolver01-1.4 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY y;
  }
} {0 {33 11}}

# SQLite allows the WHERE clause to reference output columns if there is
# no other way to resolve the name.
#
do_test resolver01-1.5 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY yy;
  }
} {0 {11 33}}
do_test resolver01-1.6 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY 1;
  }
} {0 {11 33}}

# The "ORDER BY y COLLATE nocase" form works the same as "ORDER BY y".
# The "y" binds more tightly to output columns than to input columns.
#
# This is for compatibility with SQL92 and with historical SQLite behavior.
# Note that PostgreSQL considers "y COLLATE nocase" to be an expression
# and thus PostgreSQL treats this case as if it where the 3.x case below.
#
do_test resolver01-2.1 {
  catchsql {
    SELECT 2 AS y FROM t1, t2 ORDER BY y COLLATE nocase;
  }
} {0 2}
do_test resolver01-2.2 {
  catchsql {
    SELECT 2 AS yy FROM t1, t2 ORDER BY y COLLATE nocase;
  }
} {1 {ambiguous column name: y}}
do_test resolver01-2.3 {
  catchsql {
    SELECT x AS y FROM t3 ORDER BY y COLLATE nocase;
  }
} {0 {11 33}}
do_test resolver01-2.4 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY y COLLATE nocase;
  }
} {0 {33 11}}
do_test resolver01-2.5 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY yy COLLATE nocase;
  }
} {0 {11 33}}
do_test resolver01-2.6 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY 1 COLLATE nocase;
  }
} {0 {11 33}}

# But if the form is "ORDER BY expr" then bind more tightly to the
# the input column names and only use the output column names if no
# input column name matches.
#
# This is SQL99 behavior, as implemented by PostgreSQL and MS-SQL.
# Note that Oracle works differently.
#
do_test resolver01-3.1 {
  catchsql {
    SELECT 3 AS y FROM t1, t2 ORDER BY +y;
  }
} {1 {ambiguous column name: y}}
do_test resolver01-3.2 {
  catchsql {
    SELECT 2 AS yy FROM t1, t2 ORDER BY +y;
  }
} {1 {ambiguous column name: y}}
do_test resolver01-3.3 {
  catchsql {
    SELECT x AS y FROM t3 ORDER BY +y;
  }
} {0 {33 11}}
do_test resolver01-3.4 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY +y;
  }
} {0 {33 11}}
do_test resolver01-3.5 {
  catchsql {
    SELECT x AS yy FROM t3 ORDER BY +yy
  }
} {0 {11 33}}

# This is the test case given in ticket [f617ea3125e9] (with table name
# changed from "t1" to "t4".  The behavior of (1) and (3) match with
# PostgreSQL, but we intentionally break with PostgreSQL to provide
# SQL92 behavior for case (2).
#
do_execsql_test resolver01-4.1 {
  CREATE TABLE t4(m CHAR(2));
  INSERT INTO t4 VALUES('az');
  INSERT INTO t4 VALUES('by');
  INSERT INTO t4 VALUES('cx');
  SELECT '1', substr(m,2) AS m FROM t4 ORDER BY m;
  SELECT '2', substr(m,2) AS m FROM t4 ORDER BY m COLLATE binary;
  SELECT '3', substr(m,2) AS m FROM t4 ORDER BY lower(m);
} {1 x 1 y 1 z 2 x 2 y 2 z 3 z 3 y 3 x}

##########################################################################
# Test cases for ticket [1c69be2dafc28]:  Make sure the GROUP BY binds
# more tightly to the input tables in all cases.
#
# This first case case has been wrong in SQLite for time out of mind.
# For SQLite version 3.7.17 the answer was two rows, which is wrong.
#
do_execsql_test resolver01-5.1 {
  CREATE TABLE t5(m CHAR(2));
  INSERT INTO t5 VALUES('ax');
  INSERT INTO t5 VALUES('bx');
  INSERT INTO t5 VALUES('cy');
  SELECT count(*), substr(m,2,1) AS m FROM t5 GROUP BY m ORDER BY 1, 2;
} {1 x 1 x 1 y}

# This case is unambiguous and has always been correct.
#
do_execsql_test resolver01-5.2 {
  SELECT count(*), substr(m,2,1) AS mx FROM t5 GROUP BY m ORDER BY 1, 2;
} {1 x 1 x 1 y}

# This case is not allowed in standard SQL, but SQLite allows and does
# the sensible thing.
#
do_execsql_test resolver01-5.3 {
  SELECT count(*), substr(m,2,1) AS mx FROM t5 GROUP BY mx ORDER BY 1, 2;
} {1 y 2 x}
do_execsql_test resolver01-5.4 {
  SELECT count(*), substr(m,2,1) AS mx FROM t5
   GROUP BY substr(m,2,1) ORDER BY 1, 2;
} {1 y 2 x}

# These test case weere provided in the 2013-08-14 email from Rob Golsteijn
# that originally reported the problem of ticket [1c69be2dafc28].
#
do_execsql_test resolver01-6.1 {
  CREATE TABLE t61(name);
  SELECT min(name) FROM t61 GROUP BY lower(name);
} {}
do_execsql_test resolver01-6.2 {
  SELECT min(name) AS name FROM t61 GROUP BY lower(name); 
} {}
do_execsql_test resolver01-6.3 {
  CREATE TABLE t63(name);
  INSERT INTO t63 VALUES (NULL);
  INSERT INTO t63 VALUES ('abc');
  SELECT count(),
       NULLIF(name,'abc') AS name
    FROM t63
   GROUP BY lower(name);
} {1 {} 1 {}}

do_execsql_test resolver01-7.1 {
  SELECT 2 AS x WHERE (SELECT x AS y WHERE 3>y);
} {2}
do_execsql_test resolver01-7.2 {
  SELECT 2 AS x WHERE (SELECT x AS y WHERE 1>y);
} {}




finish_test
