
FTS4 CONTENT OPTION

  Normally, in order to create a full-text index on a dataset, the FTS4 
  module stores a copy of all indexed documents in a specially created 
  database table.

  As of SQLite version 3.7.9, FTS4 supports a new option - "content" -
  designed to extend FTS4 to support the creation of full-text indexes where:

    * The indexed documents are not stored within the SQLite database 
      at all (a "contentless" FTS4 table), or

    * The indexed documents are stored in a database table created and
      managed by the user (an "external content" FTS4 table).

  Because the indexed documents themselves are usually much larger than 
  the full-text index, the content option can sometimes be used to achieve 
  significant space savings.

CONTENTLESS FTS4 TABLES

  In order to create an FTS4 table that does not store a copy of the indexed
  documents at all, the content option should be set to an empty string.
  For example, the following SQL creates such an FTS4 table with three
  columns - "a", "b", and "c":

    CREATE VIRTUAL TABLE t1 USING fts4(content="", a, b, c);

  Data can be inserted into such an FTS4 table using an INSERT statements.
  However, unlike ordinary FTS4 tables, the user must supply an explicit
  integer docid value. For example:

    -- This statement is Ok:
    INSERT INTO t1(docid, a, b, c) VALUES(1, 'a b c', 'd e f', 'g h i');

    -- This statement causes an error, as no docid value has been provided:
    INSERT INTO t1(a, b, c) VALUES('j k l', 'm n o', 'p q r');

  It is not possible to UPDATE or DELETE a row stored in a contentless FTS4
  table. Attempting to do so is an error.

  Contentless FTS4 tables also support SELECT statements. However, it is
  an error to attempt to retrieve the value of any table column other than
  the docid column. The auxiliary function matchinfo() may be used, but
  snippet() and offsets() may not. For example:

    -- The following statements are Ok:
    SELECT docid FROM t1 WHERE t1 MATCH 'xxx';
    SELECT docid FROM t1 WHERE a MATCH 'xxx';
    SELECT matchinfo(t1) FROM t1 WHERE t1 MATCH 'xxx';

    -- The following statements all cause errors, as the value of columns
    -- other than docid are required to evaluate them.
    SELECT * FROM t1;
    SELECT a, b FROM t1 WHERE t1 MATCH 'xxx';
    SELECT docid FROM t1 WHERE a LIKE 'xxx%';
    SELECT snippet(t1) FROM t1 WHERE t1 MATCH 'xxx';

  Errors related to attempting to retrieve column values other than docid
  are runtime errors that occur within sqlite3_step(). In some cases, for
  example if the MATCH expression in a SELECT query matches zero rows, there
  may be no error at all even if a statement does refer to column values 
  other than docid.

EXTERNAL CONTENT FTS4 TABLES

  An "external content" FTS4 table is similar to a contentless table, except
  that if evaluation of a query requires the value of a column other than 
  docid, FTS4 attempts to retrieve that value from a table (or view, or 
  virtual table) nominated by the user (hereafter referred to as the "content
  table"). The FTS4 module never writes to the content table, and writing
  to the content table does not affect the full-text index. It is the
  responsibility of the user to ensure that the content table and the 
  full-text index are consistent.

  An external content FTS4 table is created by setting the content option
  to the name of a table (or view, or virtual table) that may be queried by
  FTS4 to retrieve column values when required. If the nominated table does
  not exist, then an external content table behaves in the same way as
  a contentless table. For example:

    CREATE TABLE t2(id INTEGER PRIMARY KEY, a, b, c);
    CREATE VIRTUAL TABLE t3 USING fts4(content="t2", a, c);

  Assuming the nominated table does exist, then its columns must be the same 
  as or a superset of those defined for the FTS table.

  When a users query on the FTS table requires a column value other than
  docid, FTS attempts to read this value from the corresponding column of
  the row in the content table with a rowid value equal to the current FTS
  docid. Or, if such a row cannot be found in the content table, a NULL
  value is used instead. For example:

    CREATE TABLE t2(id INTEGER PRIMARY KEY, a, b, c, d);
    CREATE VIRTUAL TABLE t3 USING fts4(content="t2", b, c);
  
    INSERT INTO t2 VALUES(2, 'a b', 'c d', 'e f');
    INSERT INTO t2 VALUES(3, 'g h', 'i j', 'k l');
    INSERT INTO t3(docid, b, c) SELECT id, b, c FROM t2;

    -- The following query returns a single row with two columns containing
    -- the text values "i j" and "k l".
    --
    -- The query uses the full-text index to discover that the MATCH 
    -- term matches the row with docid=3. It then retrieves the values
    -- of columns b and c from the row with rowid=3 in the content table
    -- to return.
    --
    SELECT * FROM t3 WHERE t3 MATCH 'k';

    -- Following the UPDATE, the query still returns a single row, this
    -- time containing the text values "xxx" and "yyy". This is because the
    -- full-text index still indicates that the row with docid=3 matches
    -- the FTS4 query 'k', even though the documents stored in the content
    -- table have been modified.
    --
    UPDATE t2 SET b = 'xxx', c = 'yyy' WHERE rowid = 3;
    SELECT * FROM t3 WHERE t3 MATCH 'k';

    -- Following the DELETE below, the query returns one row containing two
    -- NULL values. NULL values are returned because FTS is unable to find
    -- a row with rowid=3 within the content table.
    --
    DELETE FROM t2;
    SELECT * FROM t3 WHERE t3 MATCH 'k';

  When a row is deleted from an external content FTS4 table, FTS4 needs to
  retrieve the column values of the row being deleted from the content table.
  This is so that FTS4 can update the full-text index entries for each token
  that occurs within the deleted row to indicate that that row has been 
  deleted. If the content table row cannot be found, or if it contains values
  inconsistent with the contents of the FTS index, the results can be difficult
  to predict. The FTS index may be left containing entries corresponding to the
  deleted row, which can lead to seemingly nonsensical results being returned
  by subsequent SELECT queries. The same applies when a row is updated, as
  internally an UPDATE is the same as a DELETE followed by an INSERT.
  
  Instead of writing separately to the full-text index and the content table,
  some users may wish to use database triggers to keep the full-text index
  up to date with respect to the set of documents stored in the content table.
  For example, using the tables from earlier examples:

    CREATE TRIGGER t2_bu BEFORE UPDATE ON t2 BEGIN
      DELETE FROM t3 WHERE docid=old.rowid;
    END;
    CREATE TRIGGER t2_bd BEFORE DELETE ON t2 BEGIN
      DELETE FROM t3 WHERE docid=old.rowid;
    END;

    CREATE TRIGGER t2_bu AFTER UPDATE ON t2 BEGIN
      INSERT INTO t3(docid, b, c) VALUES(new.rowid, new.b, new.c);
    END;
    CREATE TRIGGER t2_bd AFTER INSERT ON t2 BEGIN
      INSERT INTO t3(docid, b, c) VALUES(new.rowid, new.b, new.c);
    END;

  The DELETE trigger must be fired before the actual delete takes place
  on the content table. This is so that FTS4 can still retrieve the original
  values in order to update the full-text index. And the INSERT trigger must
  be fired after the new row is inserted, so as to handle the case where the
  rowid is assigned automatically within the system. The UPDATE trigger must
  be split into two parts, one fired before and one after the update of the
  content table, for the same reasons.

  FTS4 features a special command similar to the 'optimize' command that
  deletes the entire full-text index and rebuilds it based on the current
  set of documents in the content table. Assuming again that "t3" is the
  name of the external content FTS4 table, the command is:

    INSERT INTO t3(t3) VALUES('rebuild');

  This command may also be used with ordinary FTS4 tables, although it may
  only be useful if the full-text index has somehow become corrupt. It is an
  error to attempt to rebuild the full-text index maintained by a contentless
  FTS4 table.
