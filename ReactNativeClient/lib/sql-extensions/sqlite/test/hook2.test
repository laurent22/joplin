# 2017 Jan 30
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# The tests in this file focus on the pre-update hook.
# 

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix hook2

ifcapable !preupdate {
  finish_test
  return
}

#-------------------------------------------------------------------------
proc do_preupdate_test {tn sql x} {
  set X [list]
  foreach elem $x {lappend X $elem}
  uplevel do_test $tn [list "
    set ::preupdate \[list\]
    execsql { $sql }
    set ::preupdate
  "] [list $X]
}

proc preupdate_hook {args} {
  set type [lindex $args 0]
  eval lappend ::preupdate $args
  if {$type != "INSERT"} {
    for {set i 0} {$i < [db preupdate count]} {incr i} {
      lappend ::preupdate [db preupdate old $i]
    }
  }
  if {$type != "DELETE"} {
    for {set i 0} {$i < [db preupdate count]} {incr i} {
      set rc [catch { db preupdate new $i } v]
      lappend ::preupdate $v
    }
  }
}

#-------------------------------------------------------------------------
# Simple tests - INSERT, UPDATE and DELETE on a WITHOUT ROWID table.
#
db preupdate hook preupdate_hook
do_execsql_test 1.0 {
  CREATE TABLE t1(a PRIMARY KEY, b) WITHOUT ROWID;
}
do_preupdate_test 1.1 {
  INSERT INTO t1 VALUES('one', 1);
} {
  INSERT main t1 0 0  one 1
}
do_preupdate_test 1.2 {
  UPDATE t1 SET b=2 WHERE a='one';
} {
  UPDATE main t1 0 0  one 1 one 2
}
do_preupdate_test 1.3 {
  DELETE FROM t1 WHERE a='one';
} {
  DELETE main t1 0 0  one 2
}

#-------------------------------------------------------------------------
# Some more complex tests for the pre-update callback on WITHOUT ROWID
# tables.
#
#   2.1.1 - INSERT statement.
#   2.1.2 - INSERT INTO ... SELECT statement.
#   2.1.3 - REPLACE INTO ... (PK conflict)
#   2.1.4 - REPLACE INTO ... (other index conflicts)
#   2.1.5 - REPLACE INTO ... (both PK and other index conflicts)
#
#   2.2.1 - DELETE statement.
#   2.2.2 - DELETE statement that uses the truncate optimization.
#
#   2.3.1 - UPDATE statement.
#   2.3.2 - UPDATE statement that modifies the PK.
#   2.3.3 - UPDATE OR REPLACE ... (PK conflict).
#   2.3.4 - UPDATE OR REPLACE ... (other index conflicts)
#   2.3.4 - UPDATE OR REPLACE ... (both PK and other index conflicts)
#
do_execsql_test 2.0 {
  CREATE TABLE t2(a DEFAULT 4, b, c, PRIMARY KEY(b, c)) WITHOUT ROWID;
  CREATE UNIQUE INDEX t2a ON t2(a);
}

do_preupdate_test 2.1.1 {
  INSERT INTO t2(b, c) VALUES(1, 1);
} {
  INSERT main t2 0 0  4 1 1
}

do_execsql_test 2.1.2.0 {
  CREATE TABLE d1(a DEFAULT 4, b, c, PRIMARY KEY(b, c)) WITHOUT ROWID;
  CREATE UNIQUE INDEX d1a ON d1(a);
  INSERT INTO d1 VALUES(1, 2, 3);
  INSERT INTO d1 VALUES(11, 12, 13);
}
do_preupdate_test 2.1.2.1 {
  INSERT INTO t2 SELECT * FROM d1;
} {
  INSERT main t2 0 0  1 2 3
  INSERT main t2 0 0  11 12 13
}
do_preupdate_test 2.1.2.2 {
  INSERT INTO t2 SELECT a+20, b+20, c+20 FROM d1;
} {
  INSERT main t2 0 0  21 22 23
  INSERT main t2 0 0  31 32 33
}
do_execsql_test 2.1.2.3 {
  SELECT * FROM t2 ORDER BY b, c;
} {
  4 1 1
  1 2 3
  11 12 13
  21 22 23
  31 32 33
}
do_preupdate_test 2.1.3 {
  REPLACE INTO t2 VALUES(45, 22, 23);
} {
  DELETE main t2 0 0 21 22 23
  INSERT main t2 0 0 45 22 23
}
do_preupdate_test 2.1.4 {
  REPLACE INTO t2 VALUES(11, 100, 100);
} {
  DELETE main t2 0 0 11 12 13
  INSERT main t2 0 0 11 100 100
}
do_preupdate_test 2.1.5 {
  REPLACE INTO t2(c, b) VALUES(33, 32)
} {
  DELETE main t2 0 0 4 1 1 
  DELETE main t2 0 0 31 32 33
  INSERT main t2 0 0 4 32 33
}

do_execsql_test 2.2.0 {
  SELECT * FROM t2 ORDER BY b,c;
} {
  1    2   3 
  45  22  23 
  4   32  33 
  11 100 100
}
do_preupdate_test 2.2.1 {
  DELETE FROM t2 WHERE b=22;
} {
  DELETE main t2 0 0  45 22 23
}
do_preupdate_test 2.2.2 {
  DELETE FROM t2;
} {
  DELETE main t2 0 0 1 2 3 
  DELETE main t2 0 0 4 32 33 
  DELETE main t2 0 0 11 100 100
}

do_execsql_test 2.3.0 {
  CREATE TABLE t3(x, y PRIMARY KEY, z UNIQUE) WITHOUT ROWID;
  INSERT INTO t3 VALUES('a', 'b', 'c');
  INSERT INTO t3 VALUES('d', 'e', 'f');

  INSERT INTO t3 VALUES(1, 1, 1);
  INSERT INTO t3 VALUES(2, 2, 2);
  INSERT INTO t3 VALUES(3, 3, 3);
}

do_preupdate_test 2.3.1 {
  UPDATE t3 SET x=4 WHERE y IN ('b', 'e', 'x');
} {
  UPDATE main t3 0 0  a b c   4 b c
  UPDATE main t3 0 0  d e f   4 e f
}

do_preupdate_test 2.3.2 {
  UPDATE t3 SET y=y||y WHERE z IN('c', 'f');
} {
  UPDATE main t3 0 0  4 b c   4 bb c
  UPDATE main t3 0 0  4 e f   4 ee f
}

do_preupdate_test 2.3.3 {
  UPDATE OR REPLACE t3 SET y='bb' WHERE z='f'
} {
  DELETE main t3 0 0  4 bb c
  UPDATE main t3 0 0  4 ee f   4 bb f
}

do_preupdate_test 2.3.4 {
  UPDATE OR REPLACE t3 SET z=2 WHERE y=1;
} {
  DELETE main t3 0 0  2 2 2
  UPDATE main t3 0 0  1 1 1  1 1 2
}

do_preupdate_test 2.3.5 {
  UPDATE OR REPLACE t3 SET z=2, y='bb' WHERE y=3;
} {
  DELETE main t3 0 0  1 1 2
  DELETE main t3 0 0  4 bb f
  UPDATE main t3 0 0  3 3 3  3 bb 2
}
  

finish_test
