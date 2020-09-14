# 2014-06-17
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
# This file implements regression tests for SQLite library.  The
# focus of this script is testing automatic index creation logic.
#
# This file contains a single real-world test case that was giving
# suboptimal performance because of over-use of automatic indexes.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl


do_execsql_test autoindex2-100 {
  CREATE TABLE t1(
    t1_id largeint,
    did char(9),
    ptime largeint,
    exbyte char(4),
    pe_id int,
    field_id int,
    mass float,
    param10 float,
    param11 float,
    exmass float,
    deviation float,
    trange float,
    vstatus int,
    commit_status int,
    formula char(329),
    tier int DEFAULT 2,
    ssid int DEFAULT 0,
    last_operation largeint DEFAULT 0,
    admin_uuid int DEFAULT 0,
    previous_value float,
    job_id largeint,
    last_t1 largeint DEFAULT 0,
    data_t1 int,
    previous_date largeint DEFAULT 0,
    flg8 int DEFAULT 1,
    failed_fields char(100)
  );
  CREATE INDEX t1x0 on t1 (t1_id);
  CREATE INDEX t1x1 on t1 (ptime, vstatus);
  CREATE INDEX t1x2 on t1 (did, ssid, ptime, vstatus, exbyte, t1_id);
  CREATE INDEX t1x3 on t1 (job_id);
  
  CREATE TABLE t2(
    did char(9),
    client_did char(30),
    description char(49),
    uid int,
    tzid int,
    privilege int,
    param2 int,
    type char(30),
    subtype char(32),
    dparam1 char(7) DEFAULT '',
    param5 char(3) DEFAULT '',
    notional float DEFAULT 0.000000,
    create_time largeint,
    sample_time largeint DEFAULT 0,
    param6 largeint,
    frequency int,
    expiration largeint,
    uw_status int,
    next_sample largeint,
    last_sample largeint,
    reserve1 char(29) DEFAULT '',
    reserve2 char(29) DEFAULT '',
    reserve3 char(29) DEFAULT '',
    bxcdr char(19) DEFAULT 'XY',
    ssid int DEFAULT 1,
    last_t1_id largeint,
    reserve4 char(29) DEFAULT '',
    reserve5 char(29) DEFAULT '',
    param12 int DEFAULT 0,
    long_did char(100) DEFAULT '',
    gr_code int DEFAULT 0,
    drx char(100) DEFAULT '',
    parent_id char(9) DEFAULT '',
    param13 int DEFAULT 0,
    position float DEFAULT 1.000000,
    client_did3 char(100) DEFAULT '',
    client_did4 char(100) DEFAULT '',
    dlib_id char(9) DEFAULT ''
  );
  CREATE INDEX t2x0 on t2 (did);
  CREATE INDEX t2x1 on t2 (client_did);
  CREATE INDEX t2x2 on t2 (long_did);
  CREATE INDEX t2x3 on t2 (uid);
  CREATE INDEX t2x4 on t2 (param2);
  CREATE INDEX t2x5 on t2 (type);
  CREATE INDEX t2x6 on t2 (subtype);
  CREATE INDEX t2x7 on t2 (last_sample);
  CREATE INDEX t2x8 on t2 (param6);
  CREATE INDEX t2x9 on t2 (frequency);
  CREATE INDEX t2x10 on t2 (privilege);
  CREATE INDEX t2x11 on t2 (sample_time);
  CREATE INDEX t2x12 on t2 (notional);
  CREATE INDEX t2x13 on t2 (tzid);
  CREATE INDEX t2x14 on t2 (gr_code);
  CREATE INDEX t2x15 on t2 (parent_id);
  
  CREATE TABLE t3(
    uid int,
    param3 int,
    uuid int,
    acc_id int,
    cust_num int,
    numerix_id int,
    pfy char(29),
    param4 char(29),
    param15 int DEFAULT 0,
    flg7 int DEFAULT 0,
    param21 int DEFAULT 0,
    bxcdr char(2) DEFAULT 'PC',
    c31 int DEFAULT 0,
    c33 int DEFAULT 0,
    c35 int DEFAULT 0,
    c37 int,
    mgr_uuid int,
    back_up_uuid int,
    priv_mars int DEFAULT 0,
    is_qc int DEFAULT 0,
    c41 int DEFAULT 0,
    deleted int DEFAULT 0,
    c47 int DEFAULT 1
  );
  CREATE INDEX t3x0 on t3 (uid);
  CREATE INDEX t3x1 on t3 (param3);
  CREATE INDEX t3x2 on t3 (uuid);
  CREATE INDEX t3x3 on t3 (acc_id);
  CREATE INDEX t3x4 on t3 (param4);
  CREATE INDEX t3x5 on t3 (pfy);
  CREATE INDEX t3x6 on t3 (is_qc);
  SELECT count(*) FROM sqlite_master;
} {30}
do_execsql_test autoindex2-110 {
  ANALYZE sqlite_master;
  INSERT INTO sqlite_stat1 VALUES('t1','t1x3','10747267 260');
  INSERT INTO sqlite_stat1 VALUES('t1','t1x2','10747267 121 113 2 2 2 1');
  INSERT INTO sqlite_stat1 VALUES('t1','t1x1','10747267 50 40');
  INSERT INTO sqlite_stat1 VALUES('t1','t1x0','10747267 1');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x15','39667 253');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x14','39667 19834');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x13','39667 13223');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x12','39667 7');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x11','39667 17');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x10','39667 19834');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x9','39667 7934');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x8','39667 11');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x7','39667 5');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x6','39667 242');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x5','39667 1984');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x4','39667 4408');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x3','39667 81');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x2','39667 551');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x1','39667 2');
  INSERT INTO sqlite_stat1 VALUES('t2','t2x0','39667 1');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x6','569 285');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x5','569 2');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x4','569 2');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x3','569 5');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x2','569 3');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x1','569 6');
  INSERT INTO sqlite_stat1 VALUES('t3','t3x0','569 1');
  ANALYZE sqlite_master;
} {}
do_execsql_test autoindex2-120 {
  EXPLAIN QUERY PLAN
  SELECT
     t1_id,
     t1.did,
     param2,
     param3,
     t1.ptime,
     t1.trange,
     t1.exmass,
     t1.mass,
     t1.vstatus,
     type,
     subtype,
     t1.deviation,
     t1.formula,
     dparam1,
     reserve1,
     reserve2,
     param4,
     t1.last_operation,
     t1.admin_uuid,
     t1.previous_value,
     t1.job_id,
     client_did, 
     t1.last_t1,
     t1.data_t1,
     t1.previous_date,
     param5,
     param6,
     mgr_uuid
  FROM
     t1,
     t2,
     t3
  WHERE
     t1.ptime > 1393520400
     AND param3<>9001
     AND t3.flg7 = 1
     AND t1.did = t2.did
     AND t2.uid = t3.uid
  ORDER BY t1.ptime desc LIMIT 500;
} {~/AUTO/}
#
# ^^^--- Before being fixed, the above was using an automatic covering
# on t3 and reordering the tables so that t3 was in the outer loop and
# implementing the ORDER BY clause using a B-Tree.
#
# This test is sanitized data received from a user.  The original unsanitized
# data and STAT4 data is found in the th3private test repository.  See one of
# the th3private check-ins on 2016-02-25.  The test is much more accurate when
# STAT4 data is used.

finish_test
