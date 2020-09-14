# 2007 March 28
#
# The author disclaims copyright to this source code.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The focus
# of this script is testing isspace/isalnum/tolower problems with the
# FTS3 module.  Unfortunately, this code isn't a really principled set
# of tests, because it is impossible to know where new uses of these
# functions might appear.
#
# $Id: fts3al.test,v 1.2 2007/12/13 21:54:11 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Tests that startsWith() (calls isspace, tolower, isalnum) can handle
# hi-bit chars.  parseSpec() also calls isalnum here.
do_test fts3al-1.1 {
  execsql "CREATE VIRTUAL TABLE t1 USING fts3(content, \x80)"
} {}

# Additionally tests isspace() call in getToken(), and isalnum() call
# in tokenListToIdList().
do_test fts3al-1.2 {
  catch {
    execsql "CREATE VIRTUAL TABLE t2 USING fts3(content, tokenize \x80)"
  }
  sqlite3_errmsg $DB
} "unknown tokenizer: \x80"

# Additionally test final isalnum() in startsWith().
do_test fts3al-1.3 {
  execsql "CREATE VIRTUAL TABLE t3 USING fts3(content, tokenize\x80)"
} {}

# The snippet-generation code has calls to isspace() which are sort of
# hard to get to.  It finds convenient breakpoints by starting ~40
# chars before and after the matched term, and scanning ~10 chars
# around that position for isspace() characters.  The long word with
# embedded hi-bit chars causes one of these isspace() calls to be
# exercised.  The version with a couple extra spaces should cause the
# other isspace() call to be exercised.  [Both cases have been tested
# in the debugger, but I'm hoping to continue to catch it if simple
# constant changes change things slightly.
#
# The trailing and leading hi-bit chars help with code which tests for
# isspace() to coalesce multiple spaces.
#
# UPDATE: The above is no longer true; there is no such code in fts3.
# But leave the test in just the same.
# 

set word "\x80xxxxx\x80xxxxx\x80xxxxx\x80xxxxx\x80xxxxx\x80xxxxx\x80"
set phrase1 "$word $word $word target $word $word $word"
set phrase2 "$word $word $word    target    $word $word $word"

db eval {CREATE VIRTUAL TABLE t4 USING fts3(content)}
db eval "INSERT INTO t4 (content) VALUES ('$phrase1')"
db eval "INSERT INTO t4 (content) VALUES ('$phrase2')"

do_test fts3al-1.4 {
  execsql {SELECT rowid, length(snippet(t4)) FROM t4 WHERE t4 MATCH 'target'}
} {1 241 2 247}

finish_test
