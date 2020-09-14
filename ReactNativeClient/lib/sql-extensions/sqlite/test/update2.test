# 2017 January 9
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix update2

db func repeat [list string repeat]

#-------------------------------------------------------------------------
# 1.1.* A one-pass UPDATE that does balance() operations on the IPK index
#       that it is scanning.
#
# 1.2.* Same again, but with a WITHOUT ROWID table.
#
set nrow [expr 10]
do_execsql_test 1.1.0 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b);
  WITH s(i) AS ( SELECT 0 UNION ALL SELECT i+1 FROM s WHERE i<$nrow )
  INSERT INTO t1(b) SELECT char((i % 26) + 65) FROM s;
  INSERT INTO t2 SELECT * FROM t1;
}

do_execsql_test 1.1.1 {
  UPDATE t1 SET b = repeat(b, 100)
}

do_execsql_test 1.1.2 {
  SELECT * FROM t1;
} [db eval { SELECT a, repeat(b, 100) FROM t2 }]

do_execsql_test 1.2.0 {
  DROP TABLE t1;
  CREATE TABLE t1(a INT PRIMARY KEY, b) WITHOUT ROWID;
  WITH s(i) AS ( SELECT 0 UNION ALL SELECT i+1 FROM s WHERE i<$nrow )
  INSERT INTO t1(a, b) SELECT i+1, char((i % 26) + 65) FROM s;
}

#explain_i { UPDATE t1 SET b = repeat(b, 100) }
do_execsql_test 1.2.1 {
  UPDATE t1 SET b = repeat(b, 100)
}

do_execsql_test 1.2.2 {
  SELECT * FROM t1;
} [db eval { SELECT a, repeat(b, 100) FROM t2 }]


#-------------------------------------------------------------------------
# A one-pass UPDATE that does balance() operations on the IPK index
# that it is scanning.
#
do_execsql_test 2.1 {
  CREATE TABLE t3(a PRIMARY KEY, b, c);
  CREATE INDEX t3i ON t3(b);
} {}
do_execsql_test 2.2 { UPDATE t3 SET c=1 WHERE b=?      } {}
do_execsql_test 2.3 { UPDATE t3 SET c=1 WHERE rowid=?  } {}

#-------------------------------------------------------------------------
#
do_execsql_test 3.0 {
  CREATE TABLE t4(a PRIMARY KEY, b, c) WITHOUT ROWID;
  CREATE INDEX t4c ON t4(c);
  INSERT INTO t4 VALUES(1, 2, 3);
  INSERT INTO t4 VALUES(2, 3, 4);
}

do_execsql_test 3.1 {
  UPDATE t4 SET c=c+2 WHERE c>2;
  SELECT a, c FROM t4 ORDER BY a;
} {1 5 2 6}

#-------------------------------------------------------------------------
#
foreach {tn sql} {
  1 { 
    CREATE TABLE b1(a INTEGER PRIMARY KEY, b, c);
    CREATE TABLE c1(a INTEGER PRIMARY KEY, b, c, d)
  }
  2 { 
    CREATE TABLE b1(a INT PRIMARY KEY, b, c) WITHOUT ROWID;
    CREATE TABLE c1(a INT PRIMARY KEY, b, c, d) WITHOUT ROWID;
  }
} {
  execsql { DROP TABLE IF EXISTS b1; DROP TABLE IF EXISTS c1; }
  execsql $sql

  do_execsql_test 4.$tn.0 {
    CREATE UNIQUE INDEX b1c ON b1(c);
    INSERT INTO b1 VALUES(1, 'a', 1);
    INSERT INTO b1 VALUES(2, 'b', 15);
    INSERT INTO b1 VALUES(3, 'c', 3);
    INSERT INTO b1 VALUES(4, 'd', 4);
    INSERT INTO b1 VALUES(5, 'e', 5);
    INSERT INTO b1 VALUES(6, 'f', 6);
    INSERT INTO b1 VALUES(7, 'g', 7);
  }

  do_execsql_test 4.$tn.1 {
    UPDATE OR REPLACE b1 SET c=c+10 WHERE a BETWEEN 4 AND 7;
    SELECT * FROM b1 ORDER BY a;
  } {
    1 a 1
    3 c 3
    4 d 14
    5 e 15
    6 f 16
    7 g 17
  }

  do_execsql_test 4.$tn.2 {
    CREATE INDEX c1d ON c1(d, b);
    CREATE UNIQUE INDEX c1c ON c1(c, b);

    INSERT INTO c1 VALUES(1, 'a', 1,  1);
    INSERT INTO c1 VALUES(2, 'a', 15, 2);
    INSERT INTO c1 VALUES(3, 'a', 3,  3);
    INSERT INTO c1 VALUES(4, 'a', 4,  4);
    INSERT INTO c1 VALUES(5, 'a', 5,  5);
    INSERT INTO c1 VALUES(6, 'a', 6,  6);
    INSERT INTO c1 VALUES(7, 'a', 7,  7);
  }

  do_execsql_test 4.$tn.3 {
    UPDATE OR REPLACE c1 SET c=c+10 WHERE d BETWEEN 4 AND 7;
    SELECT * FROM c1 ORDER BY a;
  } {
    1 a 1 1
    3 a 3 3
    4 a 14 4
    5 a 15 5
    6 a 16 6
    7 a 17 7
  }

  do_execsql_test 4.$tn.4 { PRAGMA integrity_check } ok

  do_execsql_test 4.$tn.5 {
    DROP INDEX c1d;
    DROP INDEX c1c;
    DELETE FROM c1;

    INSERT INTO c1 VALUES(1, 'a', 1,  1);
    INSERT INTO c1 VALUES(2, 'a', 15, 2);
    INSERT INTO c1 VALUES(3, 'a', 3,  3);
    INSERT INTO c1 VALUES(4, 'a', 4,  4);
    INSERT INTO c1 VALUES(5, 'a', 5,  5);
    INSERT INTO c1 VALUES(6, 'a', 6,  6);
    INSERT INTO c1 VALUES(7, 'a', 7,  7);

    CREATE INDEX c1d ON c1(d);
    CREATE UNIQUE INDEX c1c ON c1(c);
  }

  do_execsql_test 4.$tn.6 {
    UPDATE OR REPLACE c1 SET c=c+10 WHERE d BETWEEN 4 AND 7;
    SELECT * FROM c1 ORDER BY a;
  } {
    1 a 1 1
    3 a 3 3
    4 a 14 4
    5 a 15 5
    6 a 16 6
    7 a 17 7
  }
}

#-------------------------------------------------------------------------
#
do_execsql_test 5.0 {
  CREATE TABLE x1(a INTEGER PRIMARY KEY, b, c);
  CREATE INDEX x1c ON x1(b, c);
  INSERT INTO x1 VALUES(1, 'a', 1);
  INSERT INTO x1 VALUES(2, 'a', 2);
  INSERT INTO x1 VALUES(3, 'a', 3);
}

do_execsql_test 5.1.1 {
  UPDATE x1 SET c=c+1 WHERE b='a';
}

do_execsql_test 5.1.2 {
  SELECT * FROM x1;
} {1 a 2 2 a 3 3 a 4}

do_test 5.2 {
  catch { array unset A }
  db eval { EXPLAIN UPDATE x1 SET c=c+1 WHERE b='a' } { incr A($opcode) }
  set A(NotExists)
} {1}

#-------------------------------------------------------------------------
do_execsql_test 6.0 {
  CREATE TABLE d1(a,b);
  CREATE INDEX d1b ON d1(a);
  CREATE INDEX d1c ON d1(b);
  INSERT INTO d1 VALUES(1,2);
}

do_execsql_test 6.1 {
  UPDATE d1 SET a = a+2 WHERE a>0 OR b>0;
}

do_execsql_test 6.2 {
  SELECT * FROM d1;
} {3 2}

# 2019-01-22 Bug in UPDATE OR REPLACE discovered by the 
# Matt Denton's LPM fuzzer
#
do_execsql_test 7.100 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(x,y);
  CREATE UNIQUE INDEX t1x1 ON t1(x) WHERE x IS NOT NULL;
  INSERT INTO t1(x) VALUES(NULL),(NULL);
  CREATE INDEX t1x2 ON t1(y);
  SELECT quote(x), quote(y), '|' FROM t1;
} {NULL NULL | NULL NULL |}
do_execsql_test 7.110 {
  UPDATE OR REPLACE t1 SET x=1;
  SELECT quote(x), quote(y), '|' FROM t1;
} {1 NULL |}

finish_test
