# 2010 October 23
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
# This file contains a very simple test to show that the deferred tokens
# optimization is doing something.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
ifcapable !fts3||!fts4_deferred {
  finish_test 
  return
}
set testprefix fts3defer3

set nDoclist 3204
set nDoc     800

# Set up a database that contains 800 rows. Each row contains the document
# "b b", except for the row with docid=200, which contains "a b". Hence
# token "b" is extremely common and token "a" is not.
#
do_test 1.1 {
  execsql {
    CREATE VIRTUAL TABLE t1 USING fts4;
      BEGIN;
  }
  for {set i 1} {$i <= $nDoc} {incr i} {
    set document "b b"
    if {$i==200} { set document "a b" }
    execsql { INSERT INTO t1 (docid, content) VALUES($i, $document) }
  }
  execsql COMMIT
} {}

# Check that the db contains two doclists. A small one for "a" and a 
# larger one for "b".
#
do_execsql_test 1.2 {
  SELECT blockid, length(block) FROM t1_segments;
} [list 1 8 2 $nDoclist]

# Query for 'a b'. Although this test doesn't prove so, token "b" will 
# be deferred because of the very large associated doclist.
#
do_execsql_test 1.3 {
  SELECT docid, content FROM t1 WHERE t1 MATCH 'a b';
} {200 {a b}}

# Zero out the doclist for token "b" within the database file. Now the 
# only queries that use token "b" that will work are those that defer
# it. Any query that tries to use the doclist belonging to token "b"
# will fail.
#
do_test 1.4 {
  set fd [db incrblob t1_segments block 2]
  puts -nonewline $fd [string repeat "\00" $nDoclist]
  close $fd
} {}

# The first two queries succeed, as they defer token "b". The last one
# fails, as it tries to load the corrupt doclist.
#
do_execsql_test 1.5 {
  SELECT docid, content FROM t1 WHERE t1 MATCH 'a b';
} {200 {a b}}
do_execsql_test 1.6 {
  SELECT count(*) FROM t1 WHERE t1 MATCH 'a b';
} {1}
do_catchsql_test 1.7 {
  SELECT count(*) FROM t1 WHERE t1 MATCH 'b';
} {1 {database disk image is malformed}}


finish_test
