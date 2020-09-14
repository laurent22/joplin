# 2005 November 30
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
# This file contains tests to ensure that the library handles malloc() failures
# correctly. The emphasis of these tests are the _prepare(), _step() and
# _finalize() calls.
#
# $Id: malloc3.test,v 1.24 2008/10/14 15:54:08 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc3 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# Do not run these tests if F2FS batch writes are supported. In this case,
# it is possible for a single DML statement in an implicit transaction
# to fail with SQLITE_NOMEM, but for the transaction to still end up
# committed to disk. Which confuses the tests in this module.
#
if {[atomic_batch_write test.db]} {
   puts "Skipping malloc3 tests: atomic-batch support"
   finish_test
   return
}


# Do not run these tests with an in-memory journal.
#
# In the pager layer, if an IO or OOM error occurs during a ROLLBACK, or
# when flushing a page to disk due to cache-stress, the pager enters an
# "error state". The only way out of the error state is to unlock the
# database file and end the transaction, leaving whatever journal and
# database files happen to be on disk in place. The next time the current
# (or any other) connection opens a read transaction, hot-journal rollback
# is performed if necessary.
#
# Of course, this doesn't work with an in-memory journal.
#
if {[permutation]=="inmemory_journal"} {
  finish_test
  return
}

#--------------------------------------------------------------------------
# NOTES ON RECOVERING FROM A MALLOC FAILURE
# 
# The tests in this file test the behaviours described in the following
# paragraphs. These tests test the behaviour of the system when malloc() fails
# inside of a call to _prepare(), _step(), _finalize() or _reset(). The
# handling of malloc() failures within ancillary procedures is tested
# elsewhere.
#
# Overview:
#
# Executing a statement is done in three stages (prepare, step and finalize). A
# malloc() failure may occur within any stage. If a memory allocation fails
# during statement preparation, no statement handle is returned. From the users
# point of view the system state is as if _prepare() had never been called.
#
# If the memory allocation fails during the _step() or _finalize() calls, then
# the database may be left in one of two states (after finalize() has been
# called):
#
#     * As if the neither _step() nor _finalize() had ever been called on
#       the statement handle (i.e. any changes made by the statement are
#       rolled back).
#     * The current transaction may be rolled back. In this case a hot-journal
#       may or may not actually be present in the filesystem.
#
# The caller can tell the difference between these two scenarios by invoking
# _get_autocommit().
#
#
# Handling of sqlite3_reset():
#
# If a malloc() fails while executing an sqlite3_reset() call, this is handled
# in the same way as a failure within _finalize(). The statement handle
# is not deleted and must be passed to _finalize() for resource deallocation.
# Attempting to _step() or _reset() the statement after a failed _reset() will
# always return SQLITE_NOMEM.
#
#
# Other active SQL statements:
#
# The effect of a malloc failure on concurrently executing SQL statements,
# particularly when the statement is executing with READ_UNCOMMITTED set and
# the malloc() failure mandates statement rollback only. Currently, if
# transaction rollback is required, all other vdbe's are aborted.
#
#     Non-transient mallocs in btree.c:
#         * The Btree structure itself
#         * Each BtCursor structure
#
#     Mallocs in pager.c:
#         readMasterJournal()  - Space to read the master journal name
#         pager_delmaster()    - Space for the entire master journal file
#
#         sqlite3pager_open()  - The pager structure itself
#         sqlite3_pagerget()   - Space for a new page
#         pager_open_journal() - Pager.aInJournal[] bitmap
#         sqlite3pager_write() - For in-memory databases only: history page and
#                                statement history page.
#         pager_stmt_begin()   - Pager.aInStmt[] bitmap
#
# None of the above are a huge problem. The most troublesome failures are the
# transient malloc() calls in btree.c, which can occur during the tree-balance
# operation. This means the tree being balanced will be internally inconsistent
# after the malloc() fails. To avoid the corrupt tree being read by a
# READ_UNCOMMITTED query, we have to make sure the transaction or statement
# rollback occurs before sqlite3_step() returns, not during a subsequent
# sqlite3_finalize().
#--------------------------------------------------------------------------

#--------------------------------------------------------------------------
# NOTES ON TEST IMPLEMENTATION
#
# The tests in this file are implemented differently from those in other
# files. Instead, tests are specified using three primitives: SQL, PREP and
# TEST. Each primitive has a single argument. Primitives are processed in
# the order they are specified in the file.
#
# A TEST primitive specifies a TCL script as its argument. When a TEST
# directive is encountered the Tcl script is evaluated. Usually, this Tcl
# script contains one or more calls to [do_test].
#
# A PREP primitive specifies an SQL script as its argument. When a PREP
# directive is encountered the SQL is evaluated using database connection
# [db].
#
# The SQL primitives are where the action happens. An SQL primitive must
# contain a single, valid SQL statement as its argument. When an SQL
# primitive is encountered, it is evaluated one or more times to test the
# behaviour of the system when malloc() fails during preparation or
# execution of said statement. The Nth time the statement is executed,
# the Nth malloc is said to fail. The statement is executed until it
# succeeds, i.e. (M+1) times, where M is the number of mallocs() required
# to prepare and execute the statement.
#
# Each time an SQL statement fails, the driver program (see proc [run_test]
# below) figures out if a transaction has been automatically rolled back.
# If not, it executes any TEST block immediately proceeding the SQL
# statement, then reexecutes the SQL statement with the next value of N.
#
# If a transaction has been automatically rolled back, then the driver
# program executes all the SQL specified as part of SQL or PREP primitives
# between the current SQL statement and the most recent "BEGIN". Any 
# TEST block immediately proceeding the SQL statement is evaluated, and
# then the SQL statement reexecuted with the incremented N value.
#
# That make any sense? If not, read the code in [run_test] and it might.
#
# Extra restriction imposed by the implementation:
#
# * If a PREP block starts a transaction, it must finish it.
# * A PREP block may not close a transaction it did not start.
#
#--------------------------------------------------------------------------


# These procs are used to build up a "program" in global variable
# ::run_test_script. At the end of this file, the proc [run_test] is used
# to execute the program (and all test cases contained therein).
#
set ::run_test_sql_id 0
set ::run_test_script [list]
proc TEST {id t} {lappend ::run_test_script -test [list $id $t]}
proc PREP {p} {lappend ::run_test_script -prep [string trim $p]}
proc DEBUG {s} {lappend ::run_test_script -debug $s}

# SQL --
#
#     SQL ?-norollback? <sql-text>
#
# Add an 'SQL' primitive to the program (see notes above). If the -norollback
# switch is present, then the statement is not allowed to automatically roll
# back any active transaction if malloc() fails. It must rollback the statement
# transaction only.
#
proc SQL  {a1 {a2 ""}} {
  # An SQL primitive parameter is a list of three elements, an id, a boolean
  # value indicating if the statement may cause transaction rollback when
  # malloc() fails, and the sql statement itself.
  set id [incr ::run_test_sql_id]
  if {$a2 == ""} {
    lappend ::run_test_script -sql [list $id true [string trim $a1]]
  } else {
    lappend ::run_test_script -sql [list $id false [string trim $a2]]
  }
}

# TEST_AUTOCOMMIT --
# 
#     A shorthand test to see if a transaction is active or not. The first
#     argument - $id - is the integer number of the test case. The second
#     argument is either 1 or 0, the expected value of the auto-commit flag.
#
proc TEST_AUTOCOMMIT {id a} {
    TEST $id "do_test \$testid { sqlite3_get_autocommit \$::DB } {$a}"
}

#--------------------------------------------------------------------------
# Start of test program declaration
#


# Warm body test. A malloc() fails in the middle of a CREATE TABLE statement
# in a single-statement transaction on an empty database. Not too much can go
# wrong here.
#
TEST 1 {
  do_test $testid {
    execsql {SELECT tbl_name FROM sqlite_master;}
  } {}
}
SQL { 
  CREATE TABLE IF NOT EXISTS abc(a, b, c); 
}
TEST 2 {
  do_test $testid.1 {
    execsql {SELECT tbl_name FROM sqlite_master;}
  } {abc}
}

# Insert a couple of rows into the table. each insert is in its own
# transaction. test that the table is unpopulated before running the inserts
# (and hence after each failure of the first insert), and that it has been
# populated correctly after the final insert succeeds.
#
TEST 3 {
  do_test $testid.2 {
    execsql {SELECT * FROM abc}
  } {}
}
SQL {INSERT INTO abc VALUES(1, 2, 3);}
SQL {INSERT INTO abc VALUES(4, 5, 6);}
SQL {INSERT INTO abc VALUES(7, 8, 9);}
TEST 4 {
  do_test $testid {
    execsql {SELECT * FROM abc}
  } {1 2 3 4 5 6 7 8 9}
}

# Test a CREATE INDEX statement. Because the table 'abc' is so small, the index
# will all fit on a single page, so this doesn't test too much that the CREATE
# TABLE statement didn't test. A few of the transient malloc()s in btree.c
# perhaps.
#
SQL {CREATE INDEX abc_i ON abc(a, b, c);}
TEST 4 {
  do_test $testid {
    execsql {
      SELECT * FROM abc ORDER BY a DESC;
    }
  } {7 8 9 4 5 6 1 2 3}
}

# Test a DELETE statement. Also create a trigger and a view, just to make sure
# these statements don't have any obvious malloc() related bugs in them. Note
# that the test above will be executed each time the DELETE fails, so we're
# also testing rollback of a DELETE from a table with an index on it.
#
SQL {DELETE FROM abc WHERE a > 2;}
SQL {CREATE TRIGGER abc_t AFTER INSERT ON abc BEGIN SELECT 'trigger!'; END;}
SQL {CREATE VIEW abc_v AS SELECT * FROM abc;}
TEST 5 {
  do_test $testid {
    execsql {
      SELECT name, tbl_name FROM sqlite_master ORDER BY name;
      SELECT * FROM abc;
    }
  } {abc abc abc_i abc abc_t abc abc_v abc_v 1 2 3}
}

set sql {
  BEGIN;DELETE FROM abc;
}
for {set i 1} {$i < 100} {incr i} {
  set a $i
  set b "String value $i"
  set c [string repeat X $i]
  append sql "INSERT INTO abc VALUES ($a, '$b', '$c');"
}
append sql {COMMIT;}
PREP $sql

SQL {
  DELETE FROM abc WHERE oid IN (SELECT oid FROM abc ORDER BY random() LIMIT 5);
}
TEST 6 {
  do_test $testid.1 {
    execsql {SELECT count(*) FROM abc}
  } {94}
  do_test $testid.2 {
    execsql {
      SELECT min(
          (oid == a) AND 'String value ' || a == b AND a == length(c) 
      ) FROM abc;
    }
  } {1}
}
SQL {
  DELETE FROM abc WHERE oid IN (SELECT oid FROM abc ORDER BY random() LIMIT 5);
}
TEST 7 {
  do_test $testid {
    execsql {SELECT count(*) FROM abc}
  } {89}
  do_test $testid {
    execsql {
      SELECT min(
          (oid == a) AND 'String value ' || a == b AND a == length(c) 
      ) FROM abc;
    }
  } {1}
}
SQL {
  DELETE FROM abc WHERE oid IN (SELECT oid FROM abc ORDER BY random() LIMIT 5);
}
TEST 9 {
  do_test $testid {
    execsql {SELECT count(*) FROM abc}
  } {84}
  do_test $testid {
    execsql {
      SELECT min(
          (oid == a) AND 'String value ' || a == b AND a == length(c) 
      ) FROM abc;
    }
  } {1}
}

set padding [string repeat X 500]
PREP [subst {
  DROP TABLE abc;
  CREATE TABLE abc(a PRIMARY KEY, padding, b, c);
  INSERT INTO abc VALUES(0, '$padding', 2, 2);
  INSERT INTO abc VALUES(3, '$padding', 5, 5);
  INSERT INTO abc VALUES(6, '$padding', 8, 8);
}]

TEST 10 {
  do_test $testid {
    execsql {SELECT a, b, c FROM abc}
  } {0 2 2 3 5 5 6 8 8}
}

SQL {BEGIN;}
SQL {INSERT INTO abc VALUES(9, 'XXXXX', 11, 12);}
TEST_AUTOCOMMIT 11 0
SQL -norollback {UPDATE abc SET a = a + 1, c = c + 1;}
TEST_AUTOCOMMIT 12 0
SQL {DELETE FROM abc WHERE a = 10;}
TEST_AUTOCOMMIT 13 0
SQL {COMMIT;}

TEST 14 {
  do_test $testid.1 {
    sqlite3_get_autocommit $::DB
  } {1}
  do_test $testid.2 {
    execsql {SELECT a, b, c FROM abc}
  } {1 2 3 4 5 6 7 8 9}
}

PREP [subst {
  DROP TABLE abc;
  CREATE TABLE abc(a, padding, b, c);
  INSERT INTO abc VALUES(1, '$padding', 2, 3);
  INSERT INTO abc VALUES(4, '$padding', 5, 6);
  INSERT INTO abc VALUES(7, '$padding', 8, 9);
  CREATE INDEX abc_i ON abc(a, padding, b, c);
}]

TEST 15 {
  db eval {PRAGMA cache_size = 10}
}

SQL {BEGIN;}
SQL -norllbck {INSERT INTO abc (oid, a, padding, b, c) SELECT NULL, * FROM abc}
TEST 16 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 2 4 2 7 2}
}
SQL -norllbck {INSERT INTO abc (oid, a, padding, b, c) SELECT NULL, * FROM abc}
TEST 17 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 4 4 4 7 4}
}
SQL -norllbck {INSERT INTO abc (oid, a, padding, b, c) SELECT NULL, * FROM abc}
TEST 18 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 8 4 8 7 8}
}
SQL -norllbck {INSERT INTO abc (oid, a, padding, b, c) SELECT NULL, * FROM abc}
TEST 19 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 16 4 16 7 16}
}
SQL {COMMIT;}
TEST 21 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 16 4 16 7 16}
}

SQL {BEGIN;}
SQL {DELETE FROM abc WHERE oid %2}
TEST 22 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 8 4 8 7 8}
}
SQL {DELETE FROM abc}
TEST 23 {
  do_test $testid {
    execsql {SELECT * FROM abc}
  } {}
}
SQL {ROLLBACK;}
TEST 24 {
  do_test $testid {
    execsql {SELECT a, count(*) FROM abc GROUP BY a;}
  } {1 16 4 16 7 16}
}

# Test some schema modifications inside of a transaction. These should all
# cause transaction rollback if they fail. Also query a view, to cover a bit
# more code.
#
PREP {DROP VIEW abc_v;}
TEST 25 {
  do_test $testid {
    execsql {
      SELECT name, tbl_name FROM sqlite_master;
    }
  } {abc abc abc_i abc}
}
SQL {BEGIN;}
SQL {CREATE TABLE def(d, e, f);}
SQL {CREATE TABLE ghi(g, h, i);}
TEST 26 {
  do_test $testid {
    execsql {
      SELECT name, tbl_name FROM sqlite_master;
    }
  } {abc abc abc_i abc def def ghi ghi}
}
SQL {CREATE VIEW v1 AS SELECT * FROM def, ghi}
SQL {CREATE UNIQUE INDEX ghi_i1 ON ghi(g);}
TEST 27 {
  do_test $testid {
    execsql {
      SELECT name, tbl_name FROM sqlite_master;
    }
  } {abc abc abc_i abc def def ghi ghi v1 v1 ghi_i1 ghi}
}
SQL {INSERT INTO def VALUES('a', 'b', 'c')}
SQL {INSERT INTO def VALUES(1, 2, 3)}
SQL -norollback {INSERT INTO ghi SELECT * FROM def}
TEST 28 {
  do_test $testid {
    execsql {
      SELECT * FROM def, ghi WHERE d = g;
    }
  } {a b c a b c 1 2 3 1 2 3}
}
SQL {COMMIT}
TEST 29 {
  do_test $testid {
    execsql {
      SELECT * FROM v1 WHERE d = g;
    }
  } {a b c a b c 1 2 3 1 2 3}
}

# Test a simple multi-file transaction 
#
forcedelete test2.db
ifcapable attach {
  SQL {ATTACH 'test2.db' AS aux;}
  SQL {BEGIN}
  SQL {CREATE TABLE aux.tbl2(x, y, z)}
  SQL {INSERT INTO tbl2 VALUES(1, 2, 3)}
  SQL {INSERT INTO def VALUES(4, 5, 6)}
  TEST 30 {
    do_test $testid {
      execsql {
        SELECT * FROM tbl2, def WHERE d = x;
      }
    } {1 2 3 1 2 3}
  }
  SQL {COMMIT}
  TEST 31 {
    do_test $testid {
      execsql {
        SELECT * FROM tbl2, def WHERE d = x;
      }
    } {1 2 3 1 2 3}
  }
}

# Test what happens when a malloc() fails while there are other active
# statements. This changes the way sqlite3VdbeHalt() works.
TEST 32 {
  if {![info exists ::STMT32]} {
    set sql "SELECT name FROM sqlite_master"
    set ::STMT32 [sqlite3_prepare $::DB $sql -1 DUMMY]
    do_test $testid {
      sqlite3_step $::STMT32
    } {SQLITE_ROW}
  }
}
SQL BEGIN
TEST 33 { 
  do_test $testid {
    execsql {SELECT * FROM ghi}
  } {a b c 1 2 3}
}
SQL -norollback { 
  -- There is a unique index on ghi(g), so this statement may not cause
  -- an automatic ROLLBACK. Hence the "-norollback" switch.
  INSERT INTO ghi SELECT '2'||g, h, i FROM ghi;
}
TEST 34 {
  if {[info exists ::STMT32]} {
    do_test $testid {
      sqlite3_finalize $::STMT32
    } {SQLITE_OK}
    unset ::STMT32
  }
}
SQL COMMIT

#
# End of test program declaration
#--------------------------------------------------------------------------

proc run_test {arglist iRepeat {pcstart 0} {iFailStart 1}} {
  if {[llength $arglist] %2} {
    error "Uneven number of arguments to TEST"
  }

  for {set i 0} {$i < $pcstart} {incr i} {
    set k2 [lindex $arglist [expr {2 * $i}]]
    set v2 [lindex $arglist [expr {2 * $i + 1}]]
    set ac [sqlite3_get_autocommit $::DB]        ;# Auto-Commit
    switch -- $k2 {
      -sql  {db eval [lindex $v2 2]}
      -prep {db eval $v2}
      -debug {eval $v2}
    }
    set nac [sqlite3_get_autocommit $::DB]       ;# New Auto-Commit 
    if {$ac && !$nac} {set begin_pc $i}
  }

  db rollback_hook [list incr ::rollback_hook_count]

  set iFail $iFailStart
  set pc $pcstart
  while {$pc*2 < [llength $arglist]} {
    # Fetch the current instruction type and payload.
    set k [lindex $arglist [expr {2 * $pc}]]
    set v [lindex $arglist [expr {2 * $pc + 1}]]

    # Id of this iteration:
    set iterid "pc=$pc.iFail=$iFail$k"

    switch -- $k {

      -test { 
        foreach {id script} $v {}
        set testid "malloc3-(test $id).$iterid"
        eval $script
        incr pc
      }

      -sql {
        set ::rollback_hook_count 0

        set id [lindex $v 0]
        set testid "malloc3-(integrity $id).$iterid"

        set ac [sqlite3_get_autocommit $::DB]        ;# Auto-Commit
        sqlite3_memdebug_fail $iFail -repeat 0
        set rc [catch {db eval [lindex $v 2]} msg]   ;# True error occurs
        set nac [sqlite3_get_autocommit $::DB]       ;# New Auto-Commit 

        if {$rc != 0 && $nac && !$ac} {
          # Before [db eval] the auto-commit flag was clear. Now it
          # is set. Since an error occurred we assume this was not a
          # commit - therefore a rollback occurred. Check that the
          # rollback-hook was invoked.
          do_test malloc3-rollback_hook_count.$iterid {
            set ::rollback_hook_count
          } {1}
        }

        set nFail [sqlite3_memdebug_fail -1 -benigncnt nBenign]
        if {$rc == 0} {
            # Successful execution of sql. The number of failed malloc()
            # calls should be equal to the number of benign failures.
            # Otherwise a malloc() failed and the error was not reported.
            # 
            set expr {$nFail!=$nBenign}
            if {[expr $expr]} {
              error "Unreported malloc() failure, test \"$testid\", $expr"
            }

            if {$ac && !$nac} {
              # Before the [db eval] the auto-commit flag was set, now it
              # is clear. We can deduce that a "BEGIN" statement has just
              # been successfully executed.
              set begin_pc $pc
            } 

            incr pc
            set iFail 1
            integrity_check $testid
        } elseif {[regexp {.*out of memory} $msg] || [db errorcode] == 3082} {
            # Out of memory error, as expected.
            #
            integrity_check $testid
            incr iFail
            if {$nac && !$ac} {
              if {![lindex $v 1] && [db errorcode] != 3082} {
                # error "Statement \"[lindex $v 2]\" caused a rollback"
              }

              for {set i $begin_pc} {$i < $pc} {incr i} {
                set k2 [lindex $arglist [expr {2 * $i}]]
                set v2 [lindex $arglist [expr {2 * $i + 1}]]
                set catchupsql ""
                switch -- $k2 {
                  -sql  {set catchupsql [lindex $v2 2]}
                  -prep {set catchupsql $v2}
                }
                db eval $catchupsql
              }
            }
        } else {
            error $msg
        }

        # back up to the previous "-test" block.
        while {[lindex $arglist [expr {2 * ($pc - 1)}]] == "-test"} {
          incr pc -1
        }
      }

      -prep {
        db eval $v
        incr pc
      }

      -debug {
        eval $v
        incr pc
      }

      default { error "Unknown switch: $k" }
    }
  }
}

# Turn off the Tcl interface's prepared statement caching facility. Then
# run the tests with "persistent" malloc failures.
sqlite3_extended_result_codes db 1
db cache size 0
run_test $::run_test_script 1

# Close and reopen the db.
db close
forcedelete test.db test.db-journal test2.db test2.db-journal
sqlite3 db test.db
sqlite3_extended_result_codes db 1
set ::DB [sqlite3_connection_pointer db]

# Turn off the Tcl interface's prepared statement caching facility in
# the new connnection. Then run the tests with "transient" malloc failures.
db cache size 0
run_test $::run_test_script 0

sqlite3_memdebug_fail -1
finish_test
