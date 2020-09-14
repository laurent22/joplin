# 2008 September 15
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
# This file is focused on testing the pcache module.
#
# $Id: pcache2.test,v 1.5 2009/07/18 14:36:24 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

test_set_config_pagecache 0 0

# Set up a pcache memory pool so that we can easily track how many
# pages are being used for cache.
#
do_test pcache2-1.1 {
  db close
  sqlite3_reset_auto_extension
  sqlite3_shutdown
  sqlite3_config_pagecache 6000 100
  sqlite3_config singlethread
  sqlite3_initialize
  autoinstall_test_functions
  sqlite3_status SQLITE_STATUS_PAGECACHE_USED 1
  sqlite3_status SQLITE_STATUS_PAGECACHE_USED 0
} {0 0 0}

# Open up two database connections to separate files.
#
do_test pcache2-1.2 {
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  db eval {PRAGMA cache_size=10; SELECT 1 FROM sqlite_master;}
  lindex [sqlite3_status SQLITE_STATUS_PAGECACHE_USED 0] 1
} {2}
do_test pcache2-1.3 {
  forcedelete test2.db test2.db-journal
  sqlite3 db2 test2.db
  db2 eval {PRAGMA cache_size=50; SELECT 1 FROM sqlite_master;}
  lindex [sqlite3_status SQLITE_STATUS_PAGECACHE_USED 0] 1
} {4}


# Make lots of changes on the first connection.  Verify that the
# page cache usage does not grow to consume the page space set aside
# for the second connection.
#
do_test pcache2-1.4 {
  db eval {
     CREATE TABLE t1(a,b);
     CREATE TABLE t2(x,y);
     INSERT INTO t1 VALUES(1, zeroblob(800));
     INSERT INTO t1 VALUES(2, zeroblob(800));
     INSERT INTO t2 SELECT * FROM t1;
     INSERT INTO t1 SELECT x+2, y FROM t2;
     INSERT INTO t2 SELECT a+10, b FROM t1;
     INSERT INTO t1 SELECT x+10, y FROM t2;
     INSERT INTO t2 SELECT a+100, b FROM t1;
     INSERT INTO t1 SELECT x+100, y FROM t2;
     INSERT INTO t2 SELECT a+1000, b FROM t1;
     INSERT INTO t1 SELECT x+1000, y FROM t2;
  }
  sqlite3_status SQLITE_STATUS_PAGECACHE_USED 0
} {0 13 13}

db close
catch {db2 close}
sqlite3_reset_auto_extension
sqlite3_shutdown
sqlite3_config_pagecache 0 0
sqlite3_config serialized
sqlite3_initialize
autoinstall_test_functions

test_restore_config_pagecache
finish_test
