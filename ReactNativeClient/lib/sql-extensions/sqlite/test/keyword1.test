# 2009 January 29
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
# Verify that certain keywords can be used as identifiers.
#
# $Id: keyword1.test,v 1.1 2009/01/29 19:27:47 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

db eval {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 'one');
  INSERT INTO t1 VALUES(2, 'two');
  INSERT INTO t1 VALUES(3, 'three');
}

set kwlist {
  abort
  after
  analyze
  asc
  attach
  before
  begin
  by
  cascade
  cast
  column
  conflict
  current_date
  current_time
  current_timestamp
  database
  deferred
  desc
  detach
  end
  each
  exclusive
  explain
  fail
  for
  glob
  if
  ignore
  immediate
  initially
  instead
  key
  like
  match
  of
  offset
  plan
  pragma
  query
  raise
  recursive
  regexp
  reindex
  release
  rename
  replace
  restrict
  rollback
  row
  savepoint
  temp
  temporary
  trigger
  vacuum
  view
  virtual
  with
  without
};
set exprkw {
  cast
  current_date
  current_time
  current_timestamp
  raise
}
foreach kw $kwlist {  
  do_test keyword1-$kw.1 {
    if {$kw=="if"} {
      db eval "CREATE TABLE \"$kw\"($kw $kw)"
    } else {
      db eval "CREATE TABLE ${kw}($kw $kw)"
    }
    db eval "INSERT INTO $kw VALUES(99)"
    db eval "INSERT INTO $kw SELECT a FROM t1"
    if {[lsearch $exprkw $kw]<0} {
      db eval "SELECT * FROM $kw ORDER BY $kw ASC"
    } else {
      db eval "SELECT * FROM $kw ORDER BY \"$kw\" ASC"
    }
  } {1 2 3 99}
  do_test keyword1-$kw.2 {
    if {$kw=="if"} {
      db eval "DROP TABLE \"$kw\""
      db eval "CREATE INDEX \"$kw\" ON t1(a)"
    } else {
      db eval "DROP TABLE $kw"
      db eval "CREATE INDEX $kw ON t1(a)"
    }
    db eval "SELECT b FROM t1 INDEXED BY $kw WHERE a=2"
  } {two}
}

finish_test
