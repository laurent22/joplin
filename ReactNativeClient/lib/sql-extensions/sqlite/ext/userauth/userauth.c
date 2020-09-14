/*
** 2014-09-08
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** This file contains the bulk of the implementation of the
** user-authentication extension feature.  Some parts of the user-
** authentication code are contained within the SQLite core (in the
** src/ subdirectory of the main source code tree) but those parts
** that could reasonable be separated out are moved into this file.
**
** To compile with the user-authentication feature, append this file to
** end of an SQLite amalgamation, then add the SQLITE_USER_AUTHENTICATION
** compile-time option.  See the user-auth.txt file in the same source
** directory as this file for additional information.
*/
#ifdef SQLITE_USER_AUTHENTICATION
#ifndef SQLITEINT_H
# include "sqliteInt.h"
#endif

/*
** Prepare an SQL statement for use by the user authentication logic.
** Return a pointer to the prepared statement on success.  Return a
** NULL pointer if there is an error of any kind.
*/
static sqlite3_stmt *sqlite3UserAuthPrepare(
  sqlite3 *db,
  const char *zFormat,
  ...
){
  sqlite3_stmt *pStmt;
  char *zSql;
  int rc;
  va_list ap;
  u64 savedFlags = db->flags;

  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  if( zSql==0 ) return 0;
  db->flags |= SQLITE_WriteSchema;
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  db->flags = savedFlags;
  sqlite3_free(zSql);
  if( rc ){
    sqlite3_finalize(pStmt);
    pStmt = 0;
  }
  return pStmt;
}

/*
** Check to see if the sqlite_user table exists in database zDb.
*/
static int userTableExists(sqlite3 *db, const char *zDb){
  int rc;
  sqlite3_mutex_enter(db->mutex);
  sqlite3BtreeEnterAll(db);
  if( db->init.busy==0 ){
    char *zErr = 0;
    sqlite3Init(db, &zErr);
    sqlite3DbFree(db, zErr);
  }
  rc = sqlite3FindTable(db, "sqlite_user", zDb)!=0;
  sqlite3BtreeLeaveAll(db);
  sqlite3_mutex_leave(db->mutex);
  return rc;
}

/*
** Check to see if database zDb has a "sqlite_user" table and if it does
** whether that table can authenticate zUser with nPw,zPw.  Write one of
** the UAUTH_* user authorization level codes into *peAuth and return a
** result code.
*/
static int userAuthCheckLogin(
  sqlite3 *db,               /* The database connection to check */
  const char *zDb,           /* Name of specific database to check */
  u8 *peAuth                 /* OUT: One of UAUTH_* constants */
){
  sqlite3_stmt *pStmt;
  int rc;

  *peAuth = UAUTH_Unknown;
  if( !userTableExists(db, "main") ){
    *peAuth = UAUTH_Admin;  /* No sqlite_user table.  Everybody is admin. */
    return SQLITE_OK;
  }
  if( db->auth.zAuthUser==0 ){
    *peAuth = UAUTH_Fail;
    return SQLITE_OK;
  }
  pStmt = sqlite3UserAuthPrepare(db,
            "SELECT pw=sqlite_crypt(?1,pw), isAdmin FROM \"%w\".sqlite_user"
            " WHERE uname=?2", zDb);
  if( pStmt==0 ) return SQLITE_NOMEM;
  sqlite3_bind_blob(pStmt, 1, db->auth.zAuthPW, db->auth.nAuthPW,SQLITE_STATIC);
  sqlite3_bind_text(pStmt, 2, db->auth.zAuthUser, -1, SQLITE_STATIC);
  rc = sqlite3_step(pStmt);
  if( rc==SQLITE_ROW && sqlite3_column_int(pStmt,0) ){
    *peAuth = sqlite3_column_int(pStmt, 1) + UAUTH_User;
  }else{
    *peAuth = UAUTH_Fail;
  }
  return sqlite3_finalize(pStmt);
}
int sqlite3UserAuthCheckLogin(
  sqlite3 *db,               /* The database connection to check */
  const char *zDb,           /* Name of specific database to check */
  u8 *peAuth                 /* OUT: One of UAUTH_* constants */
){
  int rc;
  u8 savedAuthLevel;
  assert( zDb!=0 );
  assert( peAuth!=0 );
  savedAuthLevel = db->auth.authLevel;
  db->auth.authLevel = UAUTH_Admin;
  rc = userAuthCheckLogin(db, zDb, peAuth);
  db->auth.authLevel = savedAuthLevel;
  return rc;
}

/*
** If the current authLevel is UAUTH_Unknown, the take actions to figure
** out what authLevel should be
*/
void sqlite3UserAuthInit(sqlite3 *db){
  if( db->auth.authLevel==UAUTH_Unknown ){
    u8 authLevel = UAUTH_Fail;
    sqlite3UserAuthCheckLogin(db, "main", &authLevel);
    db->auth.authLevel = authLevel;
    if( authLevel<UAUTH_Admin ) db->flags &= ~SQLITE_WriteSchema;
  }
}

/*
** Implementation of the sqlite_crypt(X,Y) function.
**
** If Y is NULL then generate a new hash for password X and return that
** hash.  If Y is not null, then generate a hash for password X using the
** same salt as the previous hash Y and return the new hash.
*/
void sqlite3CryptFunc(
  sqlite3_context *context,
  int NotUsed,
  sqlite3_value **argv
){
  const char *zIn;
  int nIn, ii;
  u8 *zOut;
  char zSalt[8];
  zIn = sqlite3_value_blob(argv[0]);
  nIn = sqlite3_value_bytes(argv[0]);
  if( sqlite3_value_type(argv[1])==SQLITE_BLOB
   && sqlite3_value_bytes(argv[1])==nIn+sizeof(zSalt)
  ){
    memcpy(zSalt, sqlite3_value_blob(argv[1]), sizeof(zSalt));
  }else{
    sqlite3_randomness(sizeof(zSalt), zSalt);
  }
  zOut = sqlite3_malloc( nIn+sizeof(zSalt) );
  if( zOut==0 ){
    sqlite3_result_error_nomem(context);
  }else{
    memcpy(zOut, zSalt, sizeof(zSalt));
    for(ii=0; ii<nIn; ii++){
      zOut[ii+sizeof(zSalt)] = zIn[ii]^zSalt[ii&0x7];
    }
    sqlite3_result_blob(context, zOut, nIn+sizeof(zSalt), sqlite3_free);
  }
}

/*
** If a database contains the SQLITE_USER table, then the
** sqlite3_user_authenticate() interface must be invoked with an
** appropriate username and password prior to enable read and write
** access to the database.
**
** Return SQLITE_OK on success or SQLITE_ERROR if the username/password
** combination is incorrect or unknown.
**
** If the SQLITE_USER table is not present in the database file, then
** this interface is a harmless no-op returnning SQLITE_OK.
*/
int sqlite3_user_authenticate(
  sqlite3 *db,           /* The database connection */
  const char *zUsername, /* Username */
  const char *zPW,       /* Password or credentials */
  int nPW                /* Number of bytes in aPW[] */
){
  int rc;
  u8 authLevel = UAUTH_Fail;
  db->auth.authLevel = UAUTH_Unknown;
  sqlite3_free(db->auth.zAuthUser);
  sqlite3_free(db->auth.zAuthPW);
  memset(&db->auth, 0, sizeof(db->auth));
  db->auth.zAuthUser = sqlite3_mprintf("%s", zUsername);
  if( db->auth.zAuthUser==0 ) return SQLITE_NOMEM;
  db->auth.zAuthPW = sqlite3_malloc( nPW+1 );
  if( db->auth.zAuthPW==0 ) return SQLITE_NOMEM;
  memcpy(db->auth.zAuthPW,zPW,nPW);
  db->auth.nAuthPW = nPW;
  rc = sqlite3UserAuthCheckLogin(db, "main", &authLevel);
  db->auth.authLevel = authLevel;
  sqlite3ExpirePreparedStatements(db, 0);
  if( rc ){
    return rc;           /* OOM error, I/O error, etc. */
  }
  if( authLevel<UAUTH_User ){
    return SQLITE_AUTH;  /* Incorrect username and/or password */
  }
  return SQLITE_OK;      /* Successful login */
}

/*
** The sqlite3_user_add() interface can be used (by an admin user only)
** to create a new user.  When called on a no-authentication-required
** database, this routine converts the database into an authentication-
** required database, automatically makes the added user an
** administrator, and logs in the current connection as that user.
** The sqlite3_user_add() interface only works for the "main" database, not
** for any ATTACH-ed databases.  Any call to sqlite3_user_add() by a
** non-admin user results in an error.
*/
int sqlite3_user_add(
  sqlite3 *db,           /* Database connection */
  const char *zUsername, /* Username to be added */
  const char *aPW,       /* Password or credentials */
  int nPW,               /* Number of bytes in aPW[] */
  int isAdmin            /* True to give new user admin privilege */
){
  sqlite3_stmt *pStmt;
  int rc;
  sqlite3UserAuthInit(db);
  if( db->auth.authLevel<UAUTH_Admin ) return SQLITE_AUTH;
  if( !userTableExists(db, "main") ){
    if( !isAdmin ) return SQLITE_AUTH;
    pStmt = sqlite3UserAuthPrepare(db, 
              "CREATE TABLE sqlite_user(\n"
              "  uname TEXT PRIMARY KEY,\n"
              "  isAdmin BOOLEAN,\n"
              "  pw BLOB\n"
              ") WITHOUT ROWID;");
    if( pStmt==0 ) return SQLITE_NOMEM;
    sqlite3_step(pStmt);
    rc = sqlite3_finalize(pStmt);
    if( rc ) return rc;
  }
  pStmt = sqlite3UserAuthPrepare(db, 
            "INSERT INTO sqlite_user(uname,isAdmin,pw)"
            " VALUES(%Q,%d,sqlite_crypt(?1,NULL))",
            zUsername, isAdmin!=0);
  if( pStmt==0 ) return SQLITE_NOMEM;
  sqlite3_bind_blob(pStmt, 1, aPW, nPW, SQLITE_STATIC);
  sqlite3_step(pStmt);
  rc = sqlite3_finalize(pStmt);
  if( rc ) return rc;
  if( db->auth.zAuthUser==0 ){
    assert( isAdmin!=0 );
    sqlite3_user_authenticate(db, zUsername, aPW, nPW);
  }
  return SQLITE_OK;
}

/*
** The sqlite3_user_change() interface can be used to change a users
** login credentials or admin privilege.  Any user can change their own
** login credentials.  Only an admin user can change another users login
** credentials or admin privilege setting.  No user may change their own 
** admin privilege setting.
*/
int sqlite3_user_change(
  sqlite3 *db,           /* Database connection */
  const char *zUsername, /* Username to change */
  const char *aPW,       /* Modified password or credentials */
  int nPW,               /* Number of bytes in aPW[] */
  int isAdmin            /* Modified admin privilege for the user */
){
  sqlite3_stmt *pStmt;
  int rc;
  u8 authLevel;

  authLevel = db->auth.authLevel;
  if( authLevel<UAUTH_User ){
    /* Must be logged in to make a change */
    return SQLITE_AUTH;
  }
  if( strcmp(db->auth.zAuthUser, zUsername)!=0 ){
    if( db->auth.authLevel<UAUTH_Admin ){
      /* Must be an administrator to change a different user */
      return SQLITE_AUTH;
    }
  }else if( isAdmin!=(authLevel==UAUTH_Admin) ){
    /* Cannot change the isAdmin setting for self */
    return SQLITE_AUTH;
  }
  db->auth.authLevel = UAUTH_Admin;
  if( !userTableExists(db, "main") ){
    /* This routine is a no-op if the user to be modified does not exist */
  }else{
    pStmt = sqlite3UserAuthPrepare(db,
              "UPDATE sqlite_user SET isAdmin=%d, pw=sqlite_crypt(?1,NULL)"
              " WHERE uname=%Q", isAdmin, zUsername);
    if( pStmt==0 ){
      rc = SQLITE_NOMEM;
    }else{
      sqlite3_bind_blob(pStmt, 1, aPW, nPW, SQLITE_STATIC);
      sqlite3_step(pStmt);
      rc = sqlite3_finalize(pStmt);
    }
  }
  db->auth.authLevel = authLevel;
  return rc;
}

/*
** The sqlite3_user_delete() interface can be used (by an admin user only)
** to delete a user.  The currently logged-in user cannot be deleted,
** which guarantees that there is always an admin user and hence that
** the database cannot be converted into a no-authentication-required
** database.
*/
int sqlite3_user_delete(
  sqlite3 *db,           /* Database connection */
  const char *zUsername  /* Username to remove */
){
  sqlite3_stmt *pStmt;
  if( db->auth.authLevel<UAUTH_Admin ){
    /* Must be an administrator to delete a user */
    return SQLITE_AUTH;
  }
  if( strcmp(db->auth.zAuthUser, zUsername)==0 ){
    /* Cannot delete self */
    return SQLITE_AUTH;
  }
  if( !userTableExists(db, "main") ){
    /* This routine is a no-op if the user to be deleted does not exist */
    return SQLITE_OK;
  }
  pStmt = sqlite3UserAuthPrepare(db,
              "DELETE FROM sqlite_user WHERE uname=%Q", zUsername);
  if( pStmt==0 ) return SQLITE_NOMEM;
  sqlite3_step(pStmt);
  return sqlite3_finalize(pStmt);
}

#endif /* SQLITE_USER_AUTHENTICATION */
