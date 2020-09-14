# 2010 February 02
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS4 module.
#
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Create the fts_kjv_genesis procedure which fills and FTS3/4 table with
# the complete text of the Book of Genesis.
#
source $testdir/genesis.tcl

# The following is a list of queries to perform against the above
# FTS3/FTS4 database.  We will be trying these queries in various
# configurations to ensure that they always return the same answers.
#
set fts4aa_queries {
  {abraham}
  {the king}
  {"the king"}
  {abraham OR joseph}
  {ab* OR jos*}
  {lived t*}
  {spake hebrew}
  {melchizedek}
  {t* melchizedek}
  {melchizedek t*}
}
unset -nocomplain fts4aa_res

# Set up the baseline results
#
do_test fts4aa-1.0 {
  db eval {
    CREATE VIRTUAL TABLE t1 USING fts4(words, tokenize porter);
  }
  fts_kjv_genesis
  foreach q $::fts4aa_queries {
    set r [db eval {SELECT docid FROM t1 WHERE words MATCH $q ORDER BY docid}]
    set ::fts4aa_res($q) $r
  }
} {}

# Legacy test cases
#
do_test fts4aa-1.1 {
  db eval {
    SELECT docid FROM t1 EXCEPT SELECT docid FROM t1_docsize
  }
} {}
do_test fts4aa-1.2 {
  db eval {
    SELECT docid FROM t1_docsize EXCEPT SELECT docid FROM t1
  }
} {}

proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit

do_test fts4aa-1.3 {
  db eval {
    SELECT docid, mit(matchinfo(t1, 'pcxnal')) FROM t1 WHERE t1 MATCH 'melchizedek';
  }
} {1014018 {1 1 1 1 1 1533 25 20}}
do_test fts4aa-1.4 {
  db eval {
    SELECT docid, mit(matchinfo(t1, 'pcxnal')) FROM t1
     WHERE t1 MATCH 'spake hebrew'
     ORDER BY docid;
  }
} {1039014 {2 1 1 40 40 1 6 6 1533 25 42} 1039017 {2 1 1 40 40 1 6 6 1533 25 26}}
do_test fts4aa-1.5 {
  db eval {
    SELECT docid, mit(matchinfo(t1, 'pcxnal')) FROM t1
     WHERE t1 MATCH 'laban overtook jacob'
     ORDER BY docid;
  }
} {1031025 {3 1 2 54 46 1 3 3 2 181 160 1533 25 24}}

do_test fts4aa-1.6 {
  db eval {
    DELETE FROM t1 WHERE docid!=1050026;
    SELECT hex(size) FROM t1_docsize;
    SELECT hex(value) FROM t1_stat;
  }
} {17 01176F}

do_test fts4aa-1.7 {
  db eval {
    SELECT docid FROM t1 EXCEPT SELECT docid FROM t1_docsize
  }
} {}
do_test fts4aa-1.8 {
  db eval {
    SELECT docid FROM t1_docsize EXCEPT SELECT docid FROM t1
  }
} {}
ifcapable fts4_deferred {
  do_test fts4aa-1.9 {
    # Note: Token 'in' is being deferred in the following query. 
    db eval {
      SELECT docid, mit(matchinfo(t1, 'pcxnal')) FROM t1
       WHERE t1 MATCH 'joseph died in egypt'
       ORDER BY docid;
    }
  } {1050026 {4 1 1 1 1 1 1 1 2 1 1 1 1 1 1 23 23}}
}

# Should get the same search results from FTS3
#
do_test fts4aa-2.0 {
  db eval {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3(words, tokenize porter);
  }
  fts_kjv_genesis
} {}
unset -nocomplain ii
set ii 0
foreach {q r} [array get fts4aa_res] {
  incr ii
  do_test fts4aa-2.$ii {
    db eval {SELECT docid FROM t1 WHERE words MATCH $::q ORDER BY docid}
  } $r
}

# Should get the same search results when the page size is very large
#
do_test fts4aa-3.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=65536;
    CREATE VIRTUAL TABLE t1 USING fts4(words, tokenize porter);
  }
  fts_kjv_genesis
} {}
unset -nocomplain ii
set ii 0
foreach {q r} [array get fts4aa_res] {
  incr ii
  do_test fts4aa-3.$ii {
    db eval {SELECT docid FROM t1 WHERE words MATCH $::q ORDER BY docid}
  } $r
}

# Should get the same search results when an authorizer prevents
# all PRAGMA statements.
#
proc no_pragma_auth {code arg1 arg2 arg3 arg4 args} {
  if {$code=="SQLITE_PRAGMA"} {return SQLITE_DENY}
  return SQLITE_OK;
}
do_test fts4aa-4.0 {
  db auth ::no_pragma_auth
  db eval {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts4(words, tokenize porter);
  }
  fts_kjv_genesis
} {}
unset -nocomplain ii
set ii 0
foreach {q r} [array get fts4aa_res] {
  incr ii
  do_test fts4aa-4.$ii {
    db eval {SELECT docid FROM t1 WHERE words MATCH $::q ORDER BY docid}
  } $r
}

# 2019-11-16 https://bugs.chromium.org/p/chromium/issues/detail?id=1025472
#
db close
sqlite3 db :memory:
do_execsql_test fts4aa-5.10 {
  CREATE VIRTUAL TABLE t1 USING fts4(a, b, c, d, e,f,g,h,i,j,k,l,m,n,o,p,q,r);
  INSERT INTO t1 VALUES('X Y', '2', '3', '4', '5', '6', '7', '8', '9', '0',
                        'a','b','c','d','e','f','g','h');
  UPDATE t1_docsize SET size=x'88' WHERE docid=1;
} {}
do_catchsql_test fts4aa-5.20 {
  SELECT quote(matchinfo(t1, 'l')) FROM t1 WHERE t1 MATCH 'X Y';
} {1 {database disk image is malformed}}
do_execsql_test fts4aa-5.30 {
  DROP TABLE t1;
  CREATE VIRTUAL TABLE t1 USING fts4(a,b,c,d);
  INSERT INTO t1 VALUES('one two','three four','five six','seven eight');
} {}
do_catchsql_test fts4aa-5.40 {
  UPDATE t1_stat SET value=x'01010101' WHERE id=0;
  SELECT quote(matchinfo(t1,'a')) FROM t1 WHERE t1 MATCH 'one two';
} {1 {database disk image is malformed}}
do_catchsql_test fts4aa-5.50 {
  UPDATE t1_stat SET value=x'010101' WHERE id=0;
  SELECT quote(matchinfo(t1,'a')) FROM t1 WHERE t1 MATCH 'one two';
} {1 {database disk image is malformed}}
do_catchsql_test fts4aa-5.60 {
  UPDATE t1_stat SET value=x'01' WHERE id=0;
  SELECT quote(matchinfo(t1,'a')) FROM t1 WHERE t1 MATCH 'one two';
} {1 {database disk image is malformed}}
do_catchsql_test fts4aa-5.70 {
  UPDATE t1_stat SET value=x'' WHERE id=0;
  SELECT quote(matchinfo(t1,'a')) FROM t1 WHERE t1 MATCH 'one two';
} {1 {database disk image is malformed}}

# 2019-11-18 https://bugs.chromium.org/p/chromium/issues/detail?id=1025467
db close
sqlite3 db :memory:
if {$tcl_platform(byteOrder)=="littleEndian"} {
  set res {X'0200000000000000000000000E0000000E00000001000000010000000100000001000000'}
} else {
  set res {X'0000000200000000000000000000000E0000000E00000001000000010000000100000001'}
}
do_catchsql_test fts4aa-6.10 {
  CREATE VIRTUAL TABLE f USING fts4();
  INSERT INTO f_segdir VALUES (77,91,0,0,'255 77',x'0001308000004d5c4ddddddd4d4d7b4d4d4d614d8019ff4d05000001204d4d2e4d6e4d4d4d4b4d6c4d004d4d4d4d4d4d3d000000004d5d4d4d645d4d004d4d4d4d4d4d4d4d4d454d6910004d05ffff054d646c4d004d5d4d4d4d4d3d000000004d4d4d4d4d4d4d4d4d4d4d69624d4d4d04004d4d4d4d4d604d4ce1404d554d45');
  INSERT INTO f_segdir VALUES (77,108,0,0,'255 77',x'0001310000fa64004d4d4d3c5d4d654d4d4d614d8000ff4d05000001204d4d2e4d6e4d4d4dff4d4d4d4d4d4d00104d4d4d4d000000004d4d4d0400311d4d4d4d4d4d4d4d4d4d684d6910004d05ffff054d4d6c4d004d4d4d4d4d4d3d000000004d4d4d4d644d4d4d4d4d4d69624d4d4d03ed4d4d4d4d4d604d4ce1404d550080');
  INSERT INTO f_stat VALUES (0,x'80808080100000000064004d4d4d3c4d4d654d4d4d614d8000ff4df6ff1a00204d4d2e4d6e4d4d4d104d4d4d4d4d4d00104d4d4d4d4d4d69574d4d4d000031044d4d4d3e4d4d4c4d05004d6910');
  SELECT quote(matchinfo(f,'pnax')) from f where f match '0 1';
} {1 {database disk image is malformed}}

# 2019-11-18 Detect infinite loop in fts3SelectLeaf()
db close
sqlite3 db :memory:
do_catchsql_test fts4aa-7.10 {
  CREATE VIRTUAL TABLE f USING fts4();
  INSERT INTO f_segdir VALUES (63,60,60,60,'60 60',x'3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c483c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c20003c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c283c3c3c3c3c3c3c3c3c3c3c223c3c3c3c3c3c3c3c3c');
  INSERT INTO f_segments VALUES (60,x'3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c5a3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2a3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c5e3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c803c3c3c3c3c3c233c3c3c3c1c3c3c3c3c3c3c3c3c3c3c3c1b3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c273c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c1a3c3c3c3c3c3c000200003c3c3c3c3c3c3c3c3c3c3c3c3c383c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d898d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d3c3c3c3c3c3c3c3c3c3cba3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c1c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c00023c3c3c3c3c3c383c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3cbc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2c3c3c3c403c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c16161616161616163c3c3c3c3c3c3c3c3c3c3c3c3c583c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2b3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c1c013c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c20003c3c3c3c3c3c3c3c3c3c3c800000003c3c3c3c3c3c3c2c3c3c3c3c3c3c353c08080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808f4080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808080808083c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c323c3c3c3c3c3c3c3c3c3c3c4f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3cfcfcfcfcfcfcfcfcfcfcfc10fcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfd02fcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfcfc03e8fcfcfcfc3c3c3c3c3c3c8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d8d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c553c3c3c3c3c3c3c3c3c3c3c3c3c573c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c000000803c3c4dd5d5a6d52cf3d5d5d5d5d5d5d5d5d5d5d5d5d5d53c3c3c3c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c013c3c3c3c00643c3c3c3ce93c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c263c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c363c3c3c3c3c3c3c3c3c3c3c3c3c3c543c3c3c3c3c3c3c3c3c3c273c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c330000003c3c3c3c3c3c3c3c3c3c3c3c3c3c4d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c000010003c3c3c3c3c3c413c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c1c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c403c3c3c3c3c3c3c3c3c3c3c3cec0000fa3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c4c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c5e3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c1b3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c593c3c3c3c3c3c243c3c373c3c3c3c3cff3c3c3c3c3c3c3c3c3c3c3c3c3c000080003c3c3c3c3c3c3c3c3c3c353c3c3c3c3c3d3c3c3c3c3c3c3c3c3c3c3c3c4d3c3c3c3c3c3c3c3c3c3c3c3c3c40003c3c3c3c3c293c3c3c3c3c3c3c3c3c3d3c3c3c3c3c3c3c3c353c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c4f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3cff7f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c2d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3ca43c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3cbf3c3c3c3c3c3c3c3c3c008000003c3c3c3c3c3c3c3c343c3c373c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c593c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c');
  SELECT * from f where f match '0';
} {1 {database disk image is malformed}}


finish_test
