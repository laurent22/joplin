# 2007 August 20
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  This
# script tests for the fts2 rowid-versus-vacuum problem (ticket #2566).
#
# $Id: fts3b.test,v 1.3 2007/09/13 18:14:49 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (c) VALUES('this is a test');
  INSERT INTO t1 (c) VALUES('that was a test');
  INSERT INTO t1 (c) VALUES('this is fun');
  DELETE FROM t1 WHERE c = 'that was a test';
}

# Baseline test.
do_test fts3b-1.1 {
  execsql {
    SELECT rowid FROM t1 WHERE c MATCH 'this';
  }
} {1 3}

db eval {VACUUM}

# The VACUUM renumbered the t1_content table in fts2, which breaks
# this.
do_test fts3b-1.2 {
  execsql {
    SELECT rowid FROM t1 WHERE c MATCH 'this';
  }
} {1 3}

# The t2 table is unfortunately pretty contrived.  We need documents
# that are bigger than ROOT_MAX (1024) to force segments out of the
# segdir and into %_segments.  We also need to force segment merging
# to generate a hole in the %_segments table, which needs more than 16
# docs.  Beyond that, to test correct operation of BLOCK_SELECT_STMT,
# we need to merge a mult-level tree, which is where the 10,000 comes
# from.  Which is slow, thus the set of transactions, with the 500
# being a number such that 10,000/500 > 16.
set text {
  Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Maecenas
  iaculis mollis ipsum. Praesent rhoncus placerat justo. Duis non quam
  sed turpis posuere placerat. Curabitur et lorem in lorem porttitor
  aliquet. Pellentesque bibendum tincidunt diam. Vestibulum blandit
  ante nec elit. In sapien diam, facilisis eget, dictum sed, viverra
  at, felis. Vestibulum magna. Sed magna dolor, vestibulum rhoncus,
  ornare vel, vulputate sit amet, felis. Integer malesuada, tellus at
  luctus gravida, diam nunc porta nibh, nec imperdiet massa metus eu
  lectus. Aliquam nisi. Nunc fringilla nulla at lectus. Suspendisse
  potenti. Cum sociis natoque penatibus et magnis dis parturient
  montes, nascetur ridiculus mus. Pellentesque odio nulla, feugiat eu,
  suscipit nec, consequat quis, risus.
}
append text $text

db eval {CREATE VIRTUAL TABLE t2 USING fts3(c)}
set res {}
db eval {BEGIN}
for {set ii 0} {$ii<10000} {incr ii} {
  db eval {INSERT INTO t2 (c) VALUES ($text)}
  lappend res [expr {$ii+1}]
  if {($ii%500)==0} {
    db eval {
      COMMIT;
      BEGIN;
    }
  }
}
db eval {COMMIT}

do_test fts3b-2.1 {
  execsql {
    SELECT rowid FROM t2 WHERE c MATCH 'lorem';
  }
} $res

db eval {VACUUM}

# The VACUUM renumbered the t2_segment table in fts2, which would
# break the following.
do_test fts3b-2.2 {
  execsql {
    SELECT rowid FROM t2 WHERE c MATCH 'lorem';
  }
} $res

# Since fts3 is already an API break, I've marked the table-named
# column HIDDEN.

db eval {
  CREATE VIRTUAL TABLE t3 USING fts3(c);
  INSERT INTO t3 (c) VALUES('this is a test');
  INSERT INTO t3 (c) VALUES('that was a test');
  INSERT INTO t3 (c) VALUES('this is fun');
  DELETE FROM t3 WHERE c = 'that was a test';
}

# Test that the table-named column still works.
do_test fts3b-3.1 {
  execsql {
    SELECT snippet(t3) FROM t3 WHERE t3 MATCH 'test';
  }
} {{this is a <b>test</b>}}

# Test that the column doesn't appear when selecting all columns.
do_test fts3b-3.2 {
  execsql {
    SELECT * FROM t3 WHERE rowid = 1;
  }
} {{this is a test}}

# Test that the column doesn't conflict with inserts that don't name
# columns.
do_test fts3b-3.3 {
  execsql {
    INSERT INTO t3 VALUES ('another test');
  }
} {}

# fts3 adds a new implicit column, docid, which acts as an alias for
# rowid.

db eval {
  CREATE VIRTUAL TABLE t4 USING fts3(c);
  INSERT INTO t4 (c) VALUES('this is a test');
  INSERT INTO t4 (c) VALUES('that was a test');
  INSERT INTO t4 (c) VALUES('this is fun');
  DELETE FROM t4 WHERE c = 'that was a test';
}

# Test that docid is present and identical to rowid.
do_test fts3b-4.1 {
  execsql {
    SELECT rowid FROM t4 WHERE rowid <> docid;
  }
} {}

# Test that docid is hidden.
do_test fts3b-4.2 {
  execsql {
    SELECT * FROM t4 WHERE rowid = 1;
  }
} {{this is a test}}

# Test that docid can be selected.
do_test fts3b-4.3 {
  execsql {
    SELECT docid, * FROM t4 WHERE rowid = 1;
  }
} {1 {this is a test}}

# Test that docid can be used in WHERE.
do_test fts3b-4.4 {
  execsql {
    SELECT docid, * FROM t4 WHERE docid = 1;
  }
} {1 {this is a test}}

# Test that the column doesn't conflict with inserts that don't name
# columns.  [Yes, this is the same as fts3b-3.3, here just in case the
# goals of that test change.]
do_test fts3b-4.5 {
  execsql {
    INSERT INTO t4 VALUES ('another test');
  }
} {}

# Test that the docid can be forced on insert.
do_test fts3b-4.6 {
  execsql {
    INSERT INTO t4 (docid, c) VALUES (10, 'yet another test');
    SELECT * FROM t4 WHERE docid = 10;
  }
} {{yet another test}}

# Test that rowid can also be forced.
do_test fts3b-4.7 {
  execsql {
    INSERT INTO t4 (docid, c) VALUES (12, 'still testing');
    SELECT * FROM t4 WHERE docid = 12;
  }
} {{still testing}}

# If an insert tries to set both docid and rowid, require an error.
do_test fts3b-4.8 {
  catchsql {
    INSERT INTO t4 (rowid, docid, c) VALUES (14, 15, 'bad test');
    SELECT * FROM t4 WHERE docid = 14;
  }
} {1 {SQL logic error}}

do_test fts3b-4.9 {
  execsql { SELECT docid FROM t4 WHERE t4 MATCH 'testing' }
} {12}
do_test fts3b-4.10 {
  execsql { 
    UPDATE t4 SET docid = 14 WHERE docid = 12;
    SELECT docid FROM t4 WHERE t4 MATCH 'testing';
  }
} {14}
do_test fts3b-4.11 {
  execsql { SELECT * FROM t4 WHERE rowid = 14; }
} {{still testing}}
do_test fts3b-4.12 {
  execsql { SELECT * FROM t4 WHERE rowid = 12; }
} {}
do_test fts3b-4.13 {
  execsql { SELECT docid FROM t4 WHERE t4 MATCH 'still'; }
} {14}

finish_test
