<h1 align="center">The dbtotxt Tool</h1>

The dbtotxt utility program reads an SQLite database file and writes its
raw binary content to screen as a hex dump for testing and debugging
purposes.

The hex-dump output is formatted in such a way as to be easily readable
both by humans and by software.  The dbtotxt utility has long been a part
of the TH3 test suite.  The output of dbtotxt can be embedded in TH3 test
scripts and used to generate very specific database files, perhaps with
deliberately introduced corruption.  The cov1/corrupt*.test modules in
TH3 make extensive use of dbtotxt.

More recently (2018-12-13) the dbtotxt utility has been added to the SQLite 
core and the command-line shell (CLI) has been augmented to be able to read 
dbtotxt output.  The CLI dot-command is:

>     .open --hexdb  ?OPTIONAL-FILENAME?

If the OPTIONAL-FILENAME is included, then content is read from that file.
If OPTIONAL-FILENAME is omitted, then the text is taken from the input stream,
terminated by the "| end" line of the dbtotxt text.  This allows small test
databases to be embedded directly in scripts.  Consider this example:

>
    .open --hexdb
    | size 8192 pagesize 4096 filename x9.db
    | page 1 offset 0
    |      0: 53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00   SQLite format 3.
    |     16: 10 00 01 01 00 40 20 20 00 00 00 04 00 00 00 02   .....@  ........
    |     32: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 04   ................
    |     48: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00   ................
    |     80: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04   ................
    |     96: 00 2e 30 38 0d 00 00 00 01 0f c0 00 0f c0 00 00   ..08............
    |   4032: 3e 01 06 17 11 11 01 69 74 61 62 6c 65 74 31 74   >......itablet1t
    |   4048: 31 02 43 52 45 41 54 45 20 54 41 42 4c 45 20 74   1.CREATE TABLE t
    |   4064: 31 28 78 2c 79 20 44 45 46 41 55 4c 54 20 78 27   1(x,y DEFAULT x'
    |   4080: 66 66 27 2c 7a 20 44 45 46 41 55 4c 54 20 30 29   ff',z DEFAULT 0)
    | page 2 offset 4096
    |      0: 0d 08 14 00 04 00 10 00 0e 05 0a 0f 04 15 00 10   ................
    |     16: 88 02 03 05 90 04 0e 08 00 00 00 00 00 00 00 00   ................
    |   1040: 00 00 00 00 ff 87 7c 02 05 8f 78 0e 08 00 00 00   ......|...x.....
    |   2064: 00 00 00 ff 0c 0a 01 fb 00 00 00 00 00 00 00 00   ................
    |   2560: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 83   ................
    |   2576: 78 01 05 87 70 0e 08 00 00 00 00 00 00 00 00 00   x...p...........
    |   3072: 00 00 00 00 00 00 00 00 00 ff 00 00 01 fb 00 00   ................
    |   3584: 00 00 00 00 00 83 78 00 05 87 70 0e 08 00 00 00   ......x...p.....
    |   4080: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff   ................
    | end x9.db
    SELECT rowid FROM t1;
    PRAGMA integrity_check;

You can run this script to see that the database file is correctly decoded 
and loaded.  Furthermore, you can make subtle corruptions to the input
database simply by editing the hexadecimal description, then rerun the
script to verify that SQLite correctly handles the corruption.
