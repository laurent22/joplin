# 2001 October 7
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
# This file implements tests for temporary tables and indices.
#
# $Id: temptable.test,v 1.21 2009/06/16 17:49:36 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !tempdb {
  finish_test
  return
}

# Create an alternative connection to the database
#
do_test temptable-1.0 {
  sqlite3 db2 ./test.db
  set dummy {}
} {}

# Create a permanent table.
#
do_test temptable-1.1 {
  execsql {CREATE TABLE t1(a,b,c);}
  execsql {INSERT INTO t1 VALUES(1,2,3);}
  execsql {SELECT * FROM t1}
} {1 2 3}
do_test temptable-1.2 {
  catch {db2 eval {SELECT * FROM sqlite_master}}
  db2 eval {SELECT * FROM t1}
} {1 2 3}
do_test temptable-1.3 {
  execsql {SELECT name FROM sqlite_master}
} {t1}
do_test temptable-1.4 {
  db2 eval {SELECT name FROM sqlite_master}
} {t1}

# Create a temporary table.  Verify that only one of the two
# processes can see it.
#
do_test temptable-1.5 {
  db2 eval {
    CREATE TEMP TABLE t2(x,y,z);
    INSERT INTO t2 VALUES(4,5,6);
  }
  db2 eval {SELECT * FROM t2}
} {4 5 6}
do_test temptable-1.6 {
  catch {execsql {SELECT * FROM sqlite_master}}
  catchsql {SELECT * FROM t2}
} {1 {no such table: t2}}
do_test temptable-1.7 {
  catchsql {INSERT INTO t2 VALUES(8,9,0);}
} {1 {no such table: t2}}
do_test temptable-1.8 {
  db2 eval {INSERT INTO t2 VALUES(8,9,0);}
  db2 eval {SELECT * FROM t2 ORDER BY x}
} {4 5 6 8 9 0}
do_test temptable-1.9 {
  db2 eval {DELETE FROM t2 WHERE x==8}
  db2 eval {SELECT * FROM t2 ORDER BY x}
} {4 5 6}
do_test temptable-1.10 {
  db2 eval {DELETE FROM t2}
  db2 eval {SELECT * FROM t2}
} {}
do_test temptable-1.11 {
  db2 eval {
     INSERT INTO t2 VALUES(7,6,5);
     INSERT INTO t2 VALUES(4,3,2);
     SELECT * FROM t2 ORDER BY x;
  }
} {4 3 2 7 6 5}
do_test temptable-1.12 {
  db2 eval {DROP TABLE t2;}
  set r [catch {db2 eval {SELECT * FROM t2}} msg]
  lappend r $msg
} {1 {no such table: t2}}

# Make sure temporary tables work with transactions
#
do_test temptable-2.1 {
  execsql {
    BEGIN TRANSACTION;
    CREATE TEMPORARY TABLE t2(x,y);
    INSERT INTO t2 VALUES(1,2);
    SELECT * FROM t2;
  }
} {1 2}
do_test temptable-2.2 {
  execsql {ROLLBACK}
  catchsql {SELECT * FROM t2}
} {1 {no such table: t2}}
do_test temptable-2.3 {
  execsql {
    BEGIN TRANSACTION;
    CREATE TEMPORARY TABLE t2(x,y);
    INSERT INTO t2 VALUES(1,2);
    SELECT * FROM t2;
  }
} {1 2}
do_test temptable-2.4 {
  execsql {COMMIT}
  catchsql {SELECT * FROM t2}
} {0 {1 2}}
do_test temptable-2.5 {
  set r [catch {db2 eval {SELECT * FROM t2}} msg]
  lappend r $msg
} {1 {no such table: t2}}

# Make sure indices on temporary tables are also temporary.
#
do_test temptable-3.1 {
  execsql {
    CREATE INDEX i2 ON t2(x);
    SELECT name FROM sqlite_master WHERE type='index';
  }
} {}
do_test temptable-3.2 {
  execsql {
    SELECT y FROM t2 WHERE x=1;
  }
} {2}
do_test temptable-3.3 {
  execsql {
    DROP INDEX i2;
    SELECT y FROM t2 WHERE x=1;
  }
} {2}
do_test temptable-3.4 {
  execsql {
    CREATE INDEX i2 ON t2(x);
    DROP TABLE t2;
  }
  catchsql {DROP INDEX i2}
} {1 {no such index: i2}}

# Check for correct name collision processing. A name collision can
# occur when process A creates a temporary table T then process B
# creates a permanent table also named T.  The temp table in process A
# hides the existence of the permanent table.
#
do_test temptable-4.1 {
  execsql {
    CREATE TEMP TABLE t2(x,y);
    INSERT INTO t2 VALUES(10,20);
    SELECT * FROM t2;
  } db2
} {10 20}
do_test temptable-4.2 {
  execsql {
    CREATE TABLE t2(x,y,z);
    INSERT INTO t2 VALUES(9,8,7);
    SELECT * FROM t2;
  }
} {9 8 7}
do_test temptable-4.3 {
  catchsql {
    SELECT * FROM t2;
  } db2
} {0 {10 20}}
do_test temptable-4.4.1 {
  catchsql {
    SELECT * FROM temp.t2;
  } db2
} {0 {10 20}}
do_test temptable-4.4.2 {
  catchsql {
    SELECT * FROM main.t2;
  } db2
} {0 {9 8 7}}
#do_test temptable-4.4.3 {
#  catchsql {
#    SELECT name FROM main.sqlite_master WHERE type='table';
#  } db2
#} {1 {database schema has changed}}
do_test temptable-4.4.4 {
  catchsql {
    SELECT name FROM main.sqlite_master WHERE type='table';
  } db2
} {0 {t1 t2}}
do_test temptable-4.4.5 {
  catchsql {
    SELECT * FROM main.t2;
  } db2
} {0 {9 8 7}}
do_test temptable-4.4.6 {
  # TEMP takes precedence over MAIN
  catchsql {
    SELECT * FROM t2;
  } db2
} {0 {10 20}}
do_test temptable-4.5 {
  catchsql {
    DROP TABLE t2;     -- should drop TEMP
    SELECT * FROM t2;  -- data should be from MAIN
  } db2
} {0 {9 8 7}}
do_test temptable-4.6 {
  db2 close
  sqlite3 db2 ./test.db
  catchsql {
    SELECT * FROM t2;
  } db2
} {0 {9 8 7}}
do_test temptable-4.7 {
  catchsql {
    DROP TABLE t2;
    SELECT * FROM t2;
  }
} {1 {no such table: t2}}
do_test temptable-4.8 {
  db2 close
  sqlite3 db2 ./test.db
  execsql {
    CREATE TEMP TABLE t2(x unique,y);
    INSERT INTO t2 VALUES(1,2);
    SELECT * FROM t2;
  } db2
} {1 2}
do_test temptable-4.9 {
  execsql {
    CREATE TABLE t2(x unique, y);
    INSERT INTO t2 VALUES(3,4);
    SELECT * FROM t2;
  }
} {3 4}
do_test temptable-4.10.1 {
  catchsql {
    SELECT * FROM t2;
  } db2
} {0 {1 2}}
# Update: The schema is reloaded in test temptable-4.10.1. And tclsqlite.c
#         handles it and retries the query anyway.
# do_test temptable-4.10.2 {
#   catchsql {
#     SELECT name FROM sqlite_master WHERE type='table'
#   } db2
# } {1 {database schema has changed}}
do_test temptable-4.10.3 {
  catchsql {
    SELECT name FROM sqlite_master WHERE type='table'
  } db2
} {0 {t1 t2}}
do_test temptable-4.11 {
  execsql {
    SELECT * FROM t2;
  } db2
} {1 2}
do_test temptable-4.12 {
  execsql {
    SELECT * FROM t2;
  }
} {3 4}
do_test temptable-4.13 {
  catchsql {
    DROP TABLE t2;     -- drops TEMP.T2
    SELECT * FROM t2;  -- uses MAIN.T2
  } db2
} {0 {3 4}}
do_test temptable-4.14 {
  execsql {
    SELECT * FROM t2;
  }
} {3 4}
do_test temptable-4.15 {
  db2 close
  sqlite3 db2 ./test.db
  execsql {
    SELECT * FROM t2;
  } db2
} {3 4}

# Now create a temporary table in db2 and a permanent index in db.  The
# temporary table in db2 should mask the name of the permanent index,
# but the permanent index should still be accessible and should still
# be updated when its corresponding table changes.
#
do_test temptable-5.1 {
  execsql {
    CREATE TEMP TABLE mask(a,b,c)
  } db2
  if {[permutation]=="prepare"} { db2 cache flush }
  execsql {
    CREATE INDEX mask ON t2(x);
    SELECT * FROM t2;
  }
} {3 4}
#do_test temptable-5.2 {
#  catchsql {
#    SELECT * FROM t2;
#  } db2
#} {1 {database schema has changed}}
do_test temptable-5.3 {
  catchsql {
    SELECT * FROM t2;
  } db2
} {0 {3 4}}
do_test temptable-5.4 {
  execsql {
    SELECT y FROM t2 WHERE x=3
  }
} {4}
do_test temptable-5.5 {
  execsql {
    SELECT y FROM t2 WHERE x=3
  } db2
} {4}
do_test temptable-5.6 {
  execsql {
    INSERT INTO t2 VALUES(1,2);
    SELECT y FROM t2 WHERE x=1;
  } db2
} {2}
do_test temptable-5.7 {
  execsql {
    SELECT y FROM t2 WHERE x=3
  } db2
} {4}
do_test temptable-5.8 {
  execsql {
    SELECT y FROM t2 WHERE x=1;
  }
} {2}
do_test temptable-5.9 {
  execsql {
    SELECT y FROM t2 WHERE x=3
  }
} {4}

db2 close

# Test for correct operation of read-only databases
#
do_test temptable-6.1 {
  execsql {
    CREATE TABLE t8(x);
    INSERT INTO t8 VALUES('xyzzy');
    SELECT * FROM t8;
  }
} {xyzzy}
do_test temptable-6.2 {
  db close
  catch {file attributes test.db -permissions 0444}
  catch {file attributes test.db -readonly 1}
  sqlite3 db test.db
  if {[file writable test.db]} {
    error "Unable to make the database file test.db readonly - rerun this test as an unprivileged user"
  }
  execsql {
    SELECT * FROM t8;
  }
} {xyzzy}
do_test temptable-6.3 {
  if {[file writable test.db]} {
    error "Unable to make the database file test.db readonly - rerun this test as an unprivileged user"
  }
  catchsql {
    CREATE TABLE t9(x,y);
  }
} {1 {attempt to write a readonly database}}
do_test temptable-6.4 {
  catchsql {
    CREATE TEMP TABLE t9(x,y);
  }
} {0 {}}
do_test temptable-6.5 {
  catchsql {
    INSERT INTO t9 VALUES(1,2);
    SELECT * FROM t9;
  }
} {0 {1 2}}
do_test temptable-6.6 {
  if {[file writable test.db]} {
    error "Unable to make the database file test.db readonly - rerun this test as an unprivileged user"
  }
  catchsql {
    INSERT INTO t8 VALUES('hello');
    SELECT * FROM t8;
  }
} {1 {attempt to write a readonly database}}
do_test temptable-6.7 {
  catchsql {
    SELECT * FROM t8,t9;
  }
} {0 {xyzzy 1 2}}
do_test temptable-6.8 {
  db close
  sqlite3 db test.db
  catchsql {
    SELECT * FROM t8,t9;
  }
} {1 {no such table: t9}}

forcedelete test2.db test2.db-journal
ifcapable attach {
  do_test temptable-7.1 {
    catchsql {
      ATTACH 'test2.db' AS two;
      CREATE TEMP TABLE two.abc(x,y);
    }
  } {1 {temporary table name must be unqualified}}
}

# Need to do the following for tcl 8.5 on mac. On that configuration, the
# -readonly flag is taken so seriously that a subsequent [forcedelete]
# (required before the next test file can be executed) will fail.
#
catch {file attributes test.db -readonly 0}

do_test temptable-8.0 {
  db close
  catch {forcedelete test.db}
  sqlite3 db test.db
} {}
do_test temptable-8.1 {
  execsql { CREATE TEMP TABLE tbl2(a, b); }
  execsql {
    CREATE TABLE tbl(a, b);
    INSERT INTO tbl VALUES(1, 2);
  }
  execsql {SELECT * FROM tbl}
} {1 2}
do_test temptable-8.2 {
  execsql { CREATE TEMP TABLE tbl(a, b); }
  execsql {SELECT * FROM tbl}
} {}

finish_test
