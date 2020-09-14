# 2016 Jan 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

source [file join [file dirname [info script]] fts5_common.tcl]
ifcapable !fts5||!fts3 { finish_test ; return }
set ::testprefix fts5tok2

sqlite3_fts5_register_fts5tokenize db

#-------------------------------------------------------------------------
# Simple test cases. Using the default (ascii) tokenizer.
#
do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t5 USING fts5tokenize(unicode61);
  CREATE VIRTUAL TABLE t3 USING fts3tokenize(unicode61);
}

do_test 1.1 {
  array unset -nocomplain A

  for {set i 1} {$i < 65536} {incr i} {
    set input [format "abc%cxyz" $i]
      set expect [execsql {
        SELECT input, token, start, end FROM t3 WHERE input=$input
    }]

    incr A([llength $expect])

    set res [execsql {
      SELECT input, token, start, end FROM t5($input)
    }]
    if {$res != $expect} {error "failed at i=$i"}
  }
} {}

do_test 1.1.nTokenChars=$A(4).nSeparators=$A(8) {} {}

finish_test
