# 2009 April 30
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
# Make sure that attaching the same database multiple times in
# shared cache mode fails.
#
# $Id: shared7.test,v 1.1 2009/04/30 13:30:33 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !shared_cache { finish_test ; return }

do_test shared7-1.1 {
  set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
  sqlite3_enable_shared_cache
} {1}

# EVIDENCE-OF: R-05098-06501 In shared cache mode, attempting to attach
# the same database file more than once results in an error.
#
do_test shared7-1.2 {
  db close
  sqlite3 db test.db
  db eval {
    CREATE TABLE t1(x);
  }
  catchsql {
    ATTACH 'test.db' AS err1;
  }
} {1 {database is already attached}}

do_test shared7-1.3 {
  forcedelete test2.db test2.db-journal
  db eval {
    ATTACH 'test2.db' AS test2;
    CREATE TABLE test2.t2(y);
  }
  catchsql {
    ATTACH 'test2.db' AS err2;
  }
} {1 {database is already attached}}
do_test shared7-1.4 {
  catchsql {
    ATTACH 'test.db' AS err1;
  }
} {1 {database is already attached}}


sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
