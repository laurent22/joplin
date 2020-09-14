# 2007 August 23
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
# This file contains tests that verify that SQLite can correctly rollback
# databases after crashes when using the special IO modes triggered 
# by device IOCAP flags.
#
# $Id: crash3.test,v 1.4 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !crashtest {
  finish_test
  return
}

proc do_test2 {name tcl res1 res2} {
  set script [subst -nocommands {
    do_test $name {
      set res1 {$res1}
      set res2 {$res2}
      set res [eval {$tcl}]
      if {[set res] eq [set res1] || [set res] eq [set res2]} {
        set res "{[set res1]} or {[set res2]}"
      }
      set res
    } {{$res1} or {$res2}}
  }]
  uplevel $script
}

# This block tests crash-recovery when the IOCAP_ATOMIC flags is set.
#
# Each iteration of the following loop sets up the database to contain
# the following schema and data:
#
#    CREATE TABLE abc(a, b, c);
#    INSERT INTO abc VALUES(1, 2, 3);
#
# Then execute the SQL statement, scheduling a crash for part-way through
# the first sync() of either the database file or the journal file (often
# the journal file is not required - meaning no crash occurs).
#
# After the crash (or absence of a crash), open the database and 
# verify that:
#
#   * The integrity check passes, and
#   * The contents of table abc is either {1 2 3} or the value specified
#     to the right of the SQL statement below.
#
# The procedure is repeated 10 times for each SQL statement. Five times
# with the crash scheduled for midway through the first journal sync (if 
# any), and five times with the crash midway through the database sync.
#
set tn 1
foreach {sql res2} [list \
  {INSERT INTO abc VALUES(4, 5, 6)}                    {1 2 3 4 5 6} \
  {DELETE FROM abc}                                    {}    \
  {INSERT INTO abc SELECT * FROM abc}                  {1 2 3 1 2 3} \
  {UPDATE abc SET a = 2}                               {2 2 3}       \
  {INSERT INTO abc VALUES(4, 5, randstr(1000,1000))}   {n/a} \
  {CREATE TABLE def(d, e, f)}                          {n/a} \
] {
  for {set ii 0} {$ii < 10} {incr ii} {

    db close
    forcedelete test.db test.db-journal
    sqlite3 db test.db
    do_test crash3-1.$tn.1 {
      execsql {
        PRAGMA page_size = 1024;
        BEGIN;
        CREATE TABLE abc(a, b, c);
        INSERT INTO abc VALUES(1, 2, 3);
        COMMIT;
      }
    } {}
    db close
  
    set crashfile test.db
    if {($ii%2)==0} { append crashfile -journal }
    set rand "SELECT randstr($tn,$tn);"
    do_test crash3-1.$tn.2 [subst {
      crashsql -file $crashfile -char atomic {$rand $sql}
      sqlite3 db test.db
      execsql { PRAGMA integrity_check; }
    }] {ok}
  
    do_test2 crash3-1.$tn.3 {
      execsql { SELECT * FROM abc }
    } {1 2 3} $res2

    incr tn
  }
}

# This block tests both the IOCAP_SEQUENTIAL and IOCAP_SAFE_APPEND flags.
#
db close
forcedelete test.db test.db-journal
sqlite3 db test.db
do_test crash3-2.0 {
  execsql {
    BEGIN;
    CREATE TABLE abc(a PRIMARY KEY, b, c);
    CREATE TABLE def(d PRIMARY KEY, e, f);
    PRAGMA default_cache_size = 10;
    INSERT INTO abc VALUES(randstr(10,1000),randstr(10,1000),randstr(10,1000));
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    INSERT INTO abc 
      SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) FROM abc;
    COMMIT;
  }
} {}

set tn 1
foreach {::crashfile ::delay ::char} {
  test.db         1 sequential
  test.db         1 safe_append
  test.db-journal 1 sequential
  test.db-journal 1 safe_append
  test.db-journal 2 safe_append
  test.db-journal 2 sequential
  test.db-journal 3 sequential
  test.db-journal 3 safe_append
} {
  for {set ii 0} {$ii < 100} {incr ii} {
    set ::SQL [subst {
      SELECT randstr($ii,$ii+10);
      BEGIN;
      DELETE FROM abc WHERE random()%5;
      INSERT INTO abc 
        SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) 
        FROM abc
        WHERE (random()%5)==0;
      DELETE FROM def WHERE random()%5;
      INSERT INTO def 
        SELECT randstr(10,1000),randstr(10,1000),randstr(10,1000) 
        FROM def
        WHERE (random()%5)==0;
      COMMIT;
    }]

    do_test crash3-2.$tn.$ii {
      crashsql -file $::crashfile -delay $::delay -char $::char $::SQL
      db close
      sqlite3 db test.db
      execsql {PRAGMA integrity_check}
    } {ok}
  }
  incr tn
}

# The following block tests an interaction between IOCAP_ATOMIC and
# IOCAP_SEQUENTIAL. At one point, if both flags were set, small
# journal files that contained only a single page, but were required 
# for some other reason (i.e. nTrunk) were not being written to
# disk.
#
for {set ii 0} {$ii < 10} {incr ii} {
  db close
  forcedelete test.db test.db-journal
  crashsql -file test.db -char {sequential atomic} {
    CREATE TABLE abc(a, b, c);
  }
  sqlite3 db test.db
  do_test crash3-3.$ii {
    execsql {PRAGMA integrity_check}
  } {ok}
}

finish_test
