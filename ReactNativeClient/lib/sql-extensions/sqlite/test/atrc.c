/*
** This program generates a script that stresses the ALTER TABLE statement.
** Compile like this:
**
**      gcc -g -c sqlite3.c
**      gcc -g -o atrc atrc.c sqlite3.o -ldl -lpthread
**
** Run the program this way:
**
**      ./atrc DATABASE | ./sqlite3 DATABASE
**
** This program "atrc" generates a script that can be fed into an ordinary
** command-line shell.  The script performs many ALTER TABLE statements,
** runs ".schema --indent" and "PRAGMA integrity_check;", does more
** ALTER TABLE statements to restore the original schema, and then
** runs "PRAGMA integrity_check" again.  Every table and column has its
** name changed.  The entire script is contained within BEGIN...ROLLBACK
** so that no changes are ever actually made to the database.
*/
#include "sqlite3.h"
#include <stdio.h>

/*
** Generate the text of ALTER TABLE statements that will rename
** every column in table zTable to a generic name composed from
** zColPrefix and a sequential number.  The generated text is
** appended pConvert.  If pUndo is not NULL, then SQL text that
** will undo the change is appended to pUndo.
**
** The table to be converted must be in the "main" schema.
*/
int rename_all_columns_of_table(
  sqlite3 *db,                   /* Database connection */
  const char *zTab,              /* Table whose columns should all be renamed */
  const char *zColPrefix,        /* Prefix for new column names */
  sqlite3_str *pConvert,         /* Append ALTER TABLE statements here */
  sqlite3_str *pUndo             /* SQL to undo the change, if not NULL */
){
  sqlite3_stmt *pStmt;
  int rc;
  int cnt = 0;

  rc = sqlite3_prepare_v2(db,
         "SELECT name FROM pragma_table_info(?1);",
         -1, &pStmt, 0);
  if( rc ) return rc;
  sqlite3_bind_text(pStmt, 1, zTab, -1, SQLITE_STATIC);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    const char *zCol = (const char*)sqlite3_column_text(pStmt, 0);
    cnt++;
    sqlite3_str_appendf(pConvert,
      "ALTER TABLE \"%w\" RENAME COLUMN \"%w\" TO \"%w%d\";\n",
      zTab, zCol, zColPrefix, cnt
    );
    if( pUndo ){
      sqlite3_str_appendf(pUndo,
        "ALTER TABLE \"%w\" RENAME COLUMN \"%w%d\" TO \"%w\";\n",
        zTab, zColPrefix, cnt, zCol
      );
    }
  }
  sqlite3_finalize(pStmt);
  return SQLITE_OK; 
}

/* Rename all tables and their columns in the main database
*/
int rename_all_tables(
  sqlite3 *db,              /* Database connection */
  sqlite3_str *pConvert,    /* Append SQL to do the rename here */
  sqlite3_str *pUndo        /* Append SQL to undo the rename here */
){
  sqlite3_stmt *pStmt;
  int rc;
  int cnt = 0;

  rc = sqlite3_prepare_v2(db,
         "SELECT name FROM sqlite_schema WHERE type='table'"
         " AND name NOT LIKE 'sqlite_%';",
         -1, &pStmt, 0);
  if( rc ) return rc;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    const char *zTab = (const char*)sqlite3_column_text(pStmt, 0);
    char *zNewTab;
    char zPrefix[2];

    zPrefix[0] = (cnt%26) + 'a';
    zPrefix[1] = 0;
    zNewTab = sqlite3_mprintf("tx%d", ++cnt);
    if( pUndo ){
      sqlite3_str_appendf(pUndo,
        "ALTER TABLE \"%s\" RENAME TO \"%w\";\n",
        zNewTab, zTab
      );
    }
    rename_all_columns_of_table(db, zTab, zPrefix, pConvert, pUndo);
    sqlite3_str_appendf(pConvert,
      "ALTER TABLE \"%w\" RENAME TO \"%s\";\n",
      zTab, zNewTab
    );
    sqlite3_free(zNewTab);
  }
  sqlite3_finalize(pStmt);
  return SQLITE_OK;
}

/*
** Generate a script that does this:
**
**   (1) Start a transaction
**   (2) Rename all tables and columns to use generic names.
**   (3) Print the schema after this rename
**   (4) Run pragma integrity_check
**   (5) Do more ALTER TABLE statements to change the names back
**   (6) Run pragma integrity_check again
**   (7) Rollback the transaction
*/
int main(int argc, char **argv){
  sqlite3 *db;
  int rc;
  sqlite3_str *pConvert;
  sqlite3_str *pUndo;
  char *zDbName;
  char *zSql1, *zSql2;
  if( argc!=2 ){
    fprintf(stderr, "Usage: %s DATABASE\n", argv[0]);
  }
  zDbName = argv[1];
  rc = sqlite3_open(zDbName, &db);
  if( rc ){
    fprintf(stderr, "sqlite3_open() returns %d\n", rc);
    return 1;
  }
  pConvert = sqlite3_str_new(db);
  pUndo = sqlite3_str_new(db);
  rename_all_tables(db, pConvert, pUndo);
  zSql1 = sqlite3_str_finish(pConvert);
  zSql2 = sqlite3_str_finish(pUndo);
  sqlite3_close(db);
  printf("BEGIN;\n");
  printf("%s", zSql1);
  sqlite3_free(zSql1);
  printf(".schema --indent\n");
  printf("PRAGMA integrity_check;\n");
  printf("%s", zSql2);
  sqlite3_free(zSql2);
  printf("PRAGMA integrity_check;\n");
  printf("ROLLBACK;\n");
  return 0; 
}
