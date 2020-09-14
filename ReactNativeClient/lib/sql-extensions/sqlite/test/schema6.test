# 2017-07-30
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
# This file implements tests to show that certain CREATE TABLE statements
# generate identical database files.  For example, changes in identifier
# names, white-space, and formatting of the CREATE TABLE statement should
# produce identical table content.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix schema6
do_not_use_codec

# Command:   check_same_database_content TESTNAME SQL1 SQL2 SQL3 ...
#
# This command creates fresh databases using SQL1 and subsequent arguments
# and checks to make sure the content of all database files is byte-for-byte
# identical.  Page 1 of the database files is allowed to be different, since
# page 1 contains the sqlite_master table which is expected to vary.
#
proc check_same_database_content {basename args} {
  set i 0
  set hash {}
  foreach sql $args {
    catch {db close}
    forcedelete test.db
    sqlite3 db test.db
    db eval $sql
    set pgsz [db one {PRAGMA page_size}]
    db close
    set sz [file size test.db]
    set thishash [md5file test.db $pgsz [expr {$sz-$pgsz}]]
    if {$i==0} {
      set hash $thishash
    } else {
      do_test $basename-$i "set x $thishash" $hash
    }
    incr i
  }
}

# Command:   check_different_database_content TESTNAME SQL1 SQL2 SQL3 ...
#
# This command creates fresh databases using SQL1 and subsequent arguments
# and checks to make sure the content of all database files is different
# in ways other than on page 1.
#
proc check_different_database_content {basename args} {
  set i 0
  set hashes {}
  foreach sql $args {
    forcedelete test.db
    sqlite3 db test.db
    db eval $sql
    set pgsz [db one {PRAGMA page_size}]
    db close
    set sz [file size test.db]
    set thishash [md5file test.db $pgsz [expr {$sz-$pgsz}]]
    set j [lsearch $hashes $thishash]
    if {$j>=0} {
      do_test $basename-$i "set x {$i is the same as $j}" "All are different"
    } else {
      do_test $basename-$i "set x {All are different}" "All are different"
    }
    lappend hashes $thishash
    incr i
  }
}

check_same_database_content 100 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(xyz INTEGER, abc, PRIMARY KEY(xyz), UNIQUE(abc));
  INSERT INTO t1(xyz,abc) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(xyz INTEGER, abc, UNIQUE(abc), PRIMARY KEY(xyz));
  INSERT INTO t1(xyz,abc) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY ASC, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  CREATE UNIQUE INDEX t1b ON t1(b);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
  CREATE UNIQUE INDEX t1b ON t1(b);
}

check_same_database_content 110 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY UNIQUE, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b UNIQUE, UNIQUE(a));
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b);
  CREATE UNIQUE INDEX t1b ON t1(b);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
  CREATE UNIQUE INDEX t1b ON t1(b);
}

check_same_database_content 120 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(xyz INTEGER, abc, PRIMARY KEY(xyz), UNIQUE(abc))WITHOUT ROWID;
  INSERT INTO t1(xyz,abc) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(xyz INTEGER, abc, UNIQUE(abc), PRIMARY KEY(xyz))WITHOUT ROWID;
  INSERT INTO t1(xyz,abc) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY ASC, b UNIQUE) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY UNIQUE, b UNIQUE) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b UNIQUE) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER UNIQUE PRIMARY KEY, b UNIQUE, UNIQUE(a))
       WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b) WITHOUT ROWID;
  CREATE UNIQUE INDEX t1b ON t1(b);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
  CREATE UNIQUE INDEX t1b ON t1(b);
}

check_different_database_content 130 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY UNIQUE, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
} {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE) WITHOUT ROWID;
  INSERT INTO t1(a,b) VALUES(123,'Four score and seven years ago...');
}


finish_test
