# 2014 May 12
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
set testprefix fts4growth

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

source $testdir/genesis.tcl

sqlite3_db_config db DEFENSIVE 0
do_execsql_test 1.1 { CREATE VIRTUAL TABLE x1 USING fts3; }

do_test 1.2 {
  foreach L {
    {"See here, young man," said Mulga Bill, "from Walgett to the sea,}
    {From Conroy's Gap to Castlereagh, there's none can ride like me.}
    {I'm good all round at everything as everybody knows,}
    {Although I'm not the one to talk -- I hate a man that blows.}
  } {
    execsql { INSERT INTO x1 VALUES($L) }
  }
  execsql { SELECT end_block, length(root) FROM x1_segdir }
} {{0 114} 114 {0 118} 118 {0 95} 95 {0 115} 115}

do_execsql_test 1.3 {
  INSERT INTO x1(x1) VALUES('optimize');
  SELECT level, end_block, length(root) FROM x1_segdir;
} {0 {0 394} 394}

do_test 1.4 {
  foreach L {
    {But riding is my special gift, my chiefest, sole delight;}
    {Just ask a wild duck can it swim, a wildcat can it fight.}
    {There's nothing clothed in hair or hide, or built of flesh or steel,}
    {There's nothing walks or jumps, or runs, on axle, hoof, or wheel,}
    {But what I'll sit, while hide will hold and girths and straps are tight:}
    {I'll ride this here two-wheeled concern right straight away at sight."}
  } {
    execsql { INSERT INTO x1 VALUES($L) }
  }
  execsql { 
    INSERT INTO x1(x1) VALUES('merge=4,4');
    SELECT level, end_block, length(root) FROM x1_segdir;
  }
} {1 {224 921} 2}

do_execsql_test 1.5 {
  SELECT length(block) FROM x1_segments;
} {921 {}}

do_test 1.6 {
  foreach L {
    {'Twas Mulga Bill, from Eaglehawk, that sought his own abode,}
    {That perched above Dead Man's Creek, beside the mountain road.}
    {He turned the cycle down the hill and mounted for the fray,}
    {But 'ere he'd gone a dozen yards it bolted clean away.}

    {It left the track, and through the trees, just like a silver steak,}
    {It whistled down the awful slope towards the Dead Man's Creek.}
    {It shaved a stump by half an inch, it dodged a big white-box:}
    {The very wallaroos in fright went scrambling up the rocks,}

    {The wombats hiding in their caves dug deeper underground,}
    {As Mulga Bill, as white as chalk, sat tight to every bound.}
    {It struck a stone and gave a spring that cleared a fallen tree,}
    {It raced beside a precipice as close as close could be;}

    {And then as Mulga Bill let out one last despairing shriek}
    {It made a leap of twenty feet into the Dead Man's Creek.}
    {It shaved a stump by half an inch, it dodged a big white-box:}
    {The very wallaroos in fright went scrambling up the rocks,}
    {The wombats hiding in their caves dug deeper underground,}
  } {
    execsql { INSERT INTO x1 VALUES($L) }
  }
  execsql { 
    SELECT level, end_block, length(root) FROM x1_segdir;
  }
} {1 {224 921} 2 1 {226 1230} 7 0 {0 98} 98}

do_execsql_test 1.7 {
  SELECT sum(length(block)) FROM x1_segments WHERE blockid IN (224,225,226)
} {1230}

#-------------------------------------------------------------------------
#
do_execsql_test 2.1 { 
  CREATE TABLE t1(docid, words);
  CREATE VIRTUAL TABLE x2 USING fts4;
}
fts_kjv_genesis 
do_test 2.2 {
  foreach id [db eval {SELECT docid FROM t1}] {
    execsql {
      INSERT INTO x2(docid, content) SELECT $id, words FROM t1 WHERE docid=$id
    }
  }
  foreach id [db eval {SELECT docid FROM t1}] {
    execsql {
      INSERT INTO x2(docid, content) SELECT NULL, words FROM t1 WHERE docid=$id
    }
    if {[db one {SELECT count(*) FROM x2_segdir WHERE level<2}]==2} break
  }
} {}

do_execsql_test 2.3 { 
  SELECT count(*) FROM x2_segdir WHERE level=2;
  SELECT count(*) FROM x2_segdir WHERE level=3;
} {6 0}

do_execsql_test 2.4 { 
  INSERT INTO x2(x2) VALUES('merge=4,4');
  SELECT count(*) FROM x2_segdir WHERE level=2;
  SELECT count(*) FROM x2_segdir WHERE level=3;
} {6 1}

do_execsql_test 2.5 { 
  SELECT end_block FROM x2_segdir WHERE level=3;
  INSERT INTO x2(x2) VALUES('merge=4,4');
  SELECT end_block FROM x2_segdir WHERE level=3;
  INSERT INTO x2(x2) VALUES('merge=4,4');
  SELECT end_block FROM x2_segdir WHERE level=3;
} {{5588 -3950} {5588 -11766} {5588 -15541}}

do_execsql_test 2.6 {
  SELECT sum(length(block)) FROM x2_segdir, x2_segments WHERE 
    blockid BETWEEN start_block AND leaves_end_block
    AND level=3
} {15541}

do_execsql_test 2.7 { 
  INSERT INTO x2(x2) VALUES('merge=1000,4');
  SELECT end_block FROM x2_segdir WHERE level=3;
} {{5588 127563}}

do_execsql_test 2.8 {
  SELECT sum(length(block)) FROM x2_segdir, x2_segments WHERE 
    blockid BETWEEN start_block AND leaves_end_block
    AND level=3
} {127563}

#--------------------------------------------------------------------------
# Test that delete markers are removed from FTS segments when possible.
# It is only possible to remove delete markers when the output of the
# merge operation will become the oldest segment in the index.
#
#   3.1 - when the oldest segment is created by an 'optimize'.
#   3.2 - when the oldest segment is created by an incremental merge.
#   3.3 - by a crisis merge.
#

proc insert_doc {args} {
  foreach iDoc $args {
    set L [lindex {
      {In your eagerness to engage the Trojans,}
      {don’t any of you charge ahead of others,}
      {trusting in your strength and horsemanship.}
      {And don’t lag behind. That will hurt our charge.}
      {Any man whose chariot confronts an enemy’s}
      {should thrust with his spear at him from there.}
      {That’s the most effective tactic, the way}
      {men wiped out city strongholds long ago —}
      {their chests full of that style and spirit.}
    } [expr $iDoc%9]]
    execsql { REPLACE INTO x3(docid, content) VALUES($iDoc, $L) }
  }
}

proc delete_doc {args} {
  foreach iDoc $args {
    execsql { DELETE FROM x3 WHERE docid = $iDoc }
  }
}

proc second {x} { lindex $x 1 }
db func second second

do_execsql_test 3.0 { CREATE VIRTUAL TABLE x3 USING fts4 }

do_test 3.1.1 {
  db transaction { insert_doc 1 2 3 4 5 6 }
  execsql { SELECT level, idx, second(end_block) FROM x3_segdir }
} {0 0 412}
do_test 3.1.2 {
  delete_doc 1 2 3 4 5 6
  execsql { SELECT count(*) FROM x3_segdir }
} {0}
do_test 3.1.3 {
  db transaction { 
    insert_doc 1 2 3 4 5 6 7 8 9
    delete_doc 9 8 7
  }
  execsql { SELECT level, idx, second(end_block) FROM x3_segdir }
} {0 0 591 0 1 65 0 2 72 0 3 76}
do_test 3.1.4 {
  execsql { INSERT INTO x3(x3) VALUES('optimize') }
  execsql { SELECT level, idx, second(end_block) FROM x3_segdir }
} {0 0 412}

do_test 3.2.1 {
  execsql { DELETE FROM x3 }
  insert_doc 8 7 6 5 4 3 2 1
  delete_doc 7 8
  execsql { SELECT count(*) FROM x3_segdir }
} {10}
do_test 3.2.2 {
  execsql { INSERT INTO x3(x3) VALUES('merge=500,10') }
  execsql { SELECT level, idx, second(end_block) FROM x3_segdir }
} {1 0 412}

# This assumes the crisis merge happens when there are already 16 
# segments and one more is added.
#
do_test 3.3.1 {
  execsql { DELETE FROM x3 }
  insert_doc 1 2 3 4 5 6  7 8 9 10 11
  delete_doc 11 10 9 8 7
  execsql { SELECT count(*) FROM x3_segdir }
} {16}

do_test 3.3.2 {
  insert_doc 12
  execsql { SELECT level, idx, second(end_block) FROM x3_segdir WHERE level=1 }
} {1 0 412}

#--------------------------------------------------------------------------
# Check a theory on a bug in fts4 - that segments with idx==0 were not 
# being incrementally merged correctly. Theory turned out to be false.
#
do_execsql_test 4.1 {
  DROP TABLE IF EXISTS x4;
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(docid, words);
  CREATE VIRTUAL TABLE x4 USING fts4(words);
}
do_test 4.2 {
  fts_kjv_genesis 
  execsql { INSERT INTO x4 SELECT words FROM t1 }
  execsql { INSERT INTO x4 SELECT words FROM t1 }
} {}

do_execsql_test 4.3 {
  SELECT level, idx, second(end_block) FROM x4_segdir 
} {0 0 117483 0 1 118006}

do_execsql_test 4.4 {
  INSERT INTO x4(x4) VALUES('merge=10,2');
  SELECT count(*) FROM x4_segdir;
} {3}

do_execsql_test 4.5 {
  INSERT INTO x4(x4) VALUES('merge=10,2');
  SELECT count(*) FROM x4_segdir;
} {3}

do_execsql_test 4.6 {
  INSERT INTO x4(x4) VALUES('merge=1000,2');
  SELECT count(*) FROM x4_segdir;
} {1}



#--------------------------------------------------------------------------
# Check that segments are not promoted if the "end_block" field does not
# contain a size.
#
do_execsql_test 5.1 {
  DROP TABLE IF EXISTS x2;
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(docid, words);
  CREATE VIRTUAL TABLE x2 USING fts4;
}
fts_kjv_genesis 

proc first {L} {lindex $L 0}
db func first first

do_test 5.2 {
  foreach r [db eval { SELECT rowid FROM t1 }] {
    execsql {
      INSERT INTO x2(docid, content) SELECT docid, words FROM t1 WHERE rowid=$r
    }
  }
  foreach d [db eval { SELECT docid FROM t1 LIMIT -1 OFFSET 20 }] {
    execsql { DELETE FROM x2 WHERE docid = $d }
  }

  execsql {
    INSERT INTO x2(x2) VALUES('optimize');
    SELECT level, idx, end_block FROM x2_segdir
  }
} {2 0 {752 1926}}

do_execsql_test 5.3 {
  UPDATE x2_segdir SET end_block = CAST( first(end_block) AS INTEGER );
  SELECT end_block, typeof(end_block) FROM x2_segdir;
} {752 integer}

do_execsql_test 5.4 {
  INSERT INTO x2 SELECT words FROM t1 LIMIT 50;
  SELECT level, idx, end_block FROM x2_segdir
} {2 0 752 0 0 {758 5174}}

do_execsql_test 5.5 {
  UPDATE x2_segdir SET end_block = end_block || ' 1926' WHERE level=2;
  INSERT INTO x2 SELECT words FROM t1 LIMIT 40;
  SELECT level, idx, end_block FROM x2_segdir
} {0 0 {752 1926} 0 1 {758 5174} 0 2 {763 4170}}

proc t1_to_x2 {} {
  foreach id [db eval {SELECT docid FROM t1 LIMIT 2}] {
    execsql {
      DELETE FROM x2 WHERE docid=$id;
      INSERT INTO x2(docid, content) SELECT $id, words FROM t1 WHERE docid=$id;
    }
  }
}

#--------------------------------------------------------------------------
# Check that segments created by auto-merge are not promoted until they
# are completed.
#

do_execsql_test 6.1 {
  CREATE VIRTUAL TABLE x5 USING fts4;
  INSERT INTO x5 SELECT words FROM t1 LIMIT 100 OFFSET 0;
  INSERT INTO x5 SELECT words FROM t1 LIMIT 100 OFFSET 25;
  INSERT INTO x5 SELECT words FROM t1 LIMIT 100 OFFSET 50;
  INSERT INTO x5 SELECT words FROM t1 LIMIT 100 OFFSET 75;
  SELECT count(*) FROM x5_segdir
} {4}

do_execsql_test 6.2 {
  INSERT INTO x5(x5) VALUES('merge=2,4');
  SELECT level, idx, end_block FROM x5_segdir;
} {0 0 {10 9216} 0 1 {21 9330} 0 2 {31 8850} 0 3 {40 8689} 1 0 {1320 -3117}}

do_execsql_test 6.3 {
  INSERT INTO x5 SELECT words FROM t1 LIMIT 100 OFFSET 100;
  SELECT level, idx, end_block FROM x5_segdir;
} {
  0 0 {10 9216} 0 1 {21 9330} 0 2 {31 8850} 
  0 3 {40 8689} 1 0 {1320 -3117} 0 4 {1329 8297}
}

do_execsql_test 6.4 {
  INSERT INTO x5(x5) VALUES('merge=200,4');
  SELECT level, idx, end_block FROM x5_segdir;
} {0 0 {1329 8297} 1 0 {1320 28009}}

do_execsql_test 6.5 {
  INSERT INTO x5 SELECT words FROM t1;
  SELECT level, idx, end_block FROM x5_segdir;
} {
  0 1 {1329 8297} 0 0 {1320 28009} 0 2 {1449 118006}
}

#--------------------------------------------------------------------------
# Ensure that if part of an incremental merge is performed by an old
# version that does not support storing segment sizes in the end_block
# field, no size is stored in the final segment (as it would be incorrect).
#
do_execsql_test 7.1 {
  CREATE VIRTUAL TABLE x6 USING fts4;
  INSERT INTO x6 SELECT words FROM t1;
  INSERT INTO x6 SELECT words FROM t1;
  INSERT INTO x6 SELECT words FROM t1;
  INSERT INTO x6 SELECT words FROM t1;
  INSERT INTO x6 SELECT words FROM t1;
  INSERT INTO x6 SELECT words FROM t1;
  SELECT level, idx, end_block FROM x6_segdir;
} {
  0 0 {118 117483} 0 1 {238 118006} 0 2 {358 118006} 
  0 3 {478 118006} 0 4 {598 118006} 0 5 {718 118006}
}

do_execsql_test 7.2 {
  INSERT INTO x6(x6) VALUES('merge=25,4');
  SELECT level, idx, end_block FROM x6_segdir;
} {
  0 0 {118 117483} 0 1 {238 118006} 0 2 {358 118006} 
  0 3 {478 118006} 0 4 {598 118006} 0 5 {718 118006}
  1 0 {23694 -69477}
}

do_execsql_test 7.3 {
  UPDATE x6_segdir SET end_block = first(end_block) WHERE level=1;
  SELECT level, idx, end_block FROM x6_segdir;
} {
  0 0 {118 117483} 0 1 {238 118006} 0 2 {358 118006} 
  0 3 {478 118006} 0 4 {598 118006} 0 5 {718 118006}
  1 0 23694
}

do_execsql_test 7.4 {
  INSERT INTO x6(x6) VALUES('merge=25,4');
  SELECT level, idx, end_block FROM x6_segdir;
} {
  0 0 {118 117483} 0 1 {238 118006} 0 2 {358 118006} 
  0 3 {478 118006} 0 4 {598 118006} 0 5 {718 118006}
  1 0 23694
}

do_execsql_test 7.5 {
  INSERT INTO x6(x6) VALUES('merge=2500,4');
  SELECT level, idx, start_block, leaves_end_block, end_block FROM x6_segdir;
} {
  1 0 719 1171 23694
}

do_execsql_test 7.6 {
  INSERT INTO x6(x6) VALUES('merge=2500,2');
  SELECT level, idx, start_block, leaves_end_block, end_block FROM x6_segdir;
} {
  1 0 719 1171 23694
}

do_execsql_test 7.7 {
  SELECT sum(length(block)) FROM x6_segments 
} {635247}


finish_test
