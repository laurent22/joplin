# 2001 September 15
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
# This file implements tests for foreign keys.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fkey7

ifcapable {!foreignkey} {
  finish_test
  return
}

do_execsql_test 1.1 {
  PRAGMA foreign_keys = 1;

  CREATE TABLE s1(a PRIMARY KEY, b);
  CREATE TABLE par(a, b REFERENCES s1, c UNIQUE, PRIMARY KEY(a));

  CREATE TABLE c1(a, b REFERENCES par);
  CREATE TABLE c2(a, b REFERENCES par);
  CREATE TABLE c3(a, b REFERENCES par(c));
}

proc auth {op tbl args} {
  if {$op == "SQLITE_READ"} { set ::tbls($tbl) 1 }
  return "SQLITE_OK"
}
db auth auth
db cache size 0
proc do_tblsread_test {tn sql tbllist} {
  array unset ::tbls
  uplevel [list execsql $sql]
  uplevel [list do_test $tn {lsort [array names ::tbls]} $tbllist]
}

do_tblsread_test 1.2 { UPDATE par SET b=? WHERE a=? } {par s1}
do_tblsread_test 1.3 { UPDATE par SET a=? WHERE b=? } {c1 c2 par}
do_tblsread_test 1.4 { UPDATE par SET c=? WHERE b=? } {c3 par}
do_tblsread_test 1.5 { UPDATE par SET a=?,b=?,c=? WHERE b=? } {c1 c2 c3 par s1}

ifcapable incrblob {
  do_execsql_test 2.0 {
    CREATE TABLE pX(x PRIMARY KEY);
    CREATE TABLE cX(a INTEGER PRIMARY KEY, b REFERENCES pX);
  }
  
  do_catchsql_test 2.1 {
    INSERT INTO cX VALUES(11, zeroblob(40));
  } {1 {FOREIGN KEY constraint failed}}
  
  do_test 2.2 {
    set stmt [sqlite3_prepare_v2 db "INSERT INTO cX VALUES(11, ?)" -1]
    sqlite3_bind_zeroblob $stmt 1 45
    sqlite3_step $stmt
    sqlite3_finalize $stmt
  } {SQLITE_CONSTRAINT}
}

ifcapable stat4 {
  do_execsql_test 3.0 {
    CREATE TABLE p4 (id INTEGER NOT NULL PRIMARY KEY);
    INSERT INTO p4 VALUES(1), (2), (3);

    CREATE TABLE c4(x INTEGER REFERENCES p4(id) DEFERRABLE INITIALLY DEFERRED);
    CREATE INDEX c4_x ON c4(x);
    INSERT INTO c4 VALUES(1), (2), (3);

    ANALYZE;
    INSERT INTO p4(id) VALUES(4);
  }
}


do_execsql_test 4.0 {
  PRAGMA foreign_keys = true;
  CREATE TABLE parent(
    p PRIMARY KEY
  );
  CREATE TABLE child(
    c UNIQUE REFERENCES parent(p)
  );
}

do_catchsql_test 4.1 {
  INSERT OR FAIL INTO child VALUES(123), (123);
} {1 {FOREIGN KEY constraint failed}}

do_execsql_test 4.2 {
  SELECT * FROM child;
} {}

do_execsql_test 4.3 {
  PRAGMA foreign_key_check;
} {}

do_catchsql_test 4.4 {
  INSERT INTO parent VALUES(123);
  INSERT OR FAIL INTO child VALUES(123), (123);
} {1 {UNIQUE constraint failed: child.c}}

do_execsql_test 4.5 {
  SELECT * FROM child;
} {123}

do_execsql_test 4.6 {
  PRAGMA foreign_key_check;
} {}

finish_test
