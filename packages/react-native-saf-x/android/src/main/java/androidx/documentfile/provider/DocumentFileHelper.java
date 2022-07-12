package androidx.documentfile.provider;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.reactnativesafx.SafXModule;

public class DocumentFileHelper {

  // https://www.reddit.com/r/androiddev/comments/orytnx/fixing_treedocumentfilefindfile_lousy_performance/
  @Nullable
  public static DocumentFile findFile(
      Context context, @NonNull DocumentFile documentFile, @NonNull String displayName) {

    if (!(documentFile instanceof TreeDocumentFile)) {
      return documentFile.findFile(displayName);
    }

    final ContentResolver resolver = context.getContentResolver();
    final Uri childrenUri =
        DocumentsContract.buildChildDocumentsUriUsingTree(
            documentFile.getUri(), DocumentsContract.getDocumentId(documentFile.getUri()));

    try (Cursor c =
        resolver.query(
            childrenUri,
            new String[] {
              DocumentsContract.Document.COLUMN_DOCUMENT_ID,
              DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            },
            null,
            null,
            null)) {
      if (c != null) {
        while (c.moveToNext()) {
          if (displayName.equals(c.getString(1))) {
            return new TreeDocumentFile(
                documentFile,
                context,
                DocumentsContract.buildDocumentUriUsingTree(documentFile.getUri(), c.getString(0)));
          }
        }
      }
    } catch (Exception e) {
      Log.w(SafXModule.NAME, "query failed: " + e);
    }

    return null;
  }
}
