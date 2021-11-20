package net.cozic.joplin.widgets.recents;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import net.cozic.joplin.R;

public class RecentsWidgetProvider extends AppWidgetProvider {
    public static final String CLICK_ACTION = "RECENTS_WIDGET_CLICK_ACTION";
    public static final String UPDATE_ACTION = "RECENTS_WIDGET_UPDATE_ACTION";

    public static final String NOTE_ID = "RECENTS_WIDGET_NOTE_ID";

    private static final int listViewId = R.id.list_view;

    private void handleClick(Context context, String noteId) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("joplin://x-callback-url/openNote?id=" + noteId));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    private void handleUpdate(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] ids = appWidgetManager.getAppWidgetIds(new ComponentName(context, getClass()));
        appWidgetManager.notifyAppWidgetViewDataChanged(ids, listViewId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) {
            return;
        }
        switch (action) {
            case CLICK_ACTION:
                String noteId = intent.getStringExtra(NOTE_ID);
                if (noteId != null) {
                    handleClick(context, noteId);
                }
                break;
            case UPDATE_ACTION:
                handleUpdate(context);
                break;
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.recents_widget);
            rv.setRemoteAdapter(listViewId, widgetIntent(context, appWidgetId));
            rv.setEmptyView(listViewId, R.id.empty_view);
            rv.setPendingIntentTemplate(listViewId, pendingIntentTemplate(context, appWidgetId));
            appWidgetManager.updateAppWidget(appWidgetId, rv);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    private Intent widgetIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, RecentsWidgetService.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
        return intent;
    }

    private PendingIntent pendingIntentTemplate(Context context, int appWidgetId) {
        Intent intent = new Intent(context, RecentsWidgetProvider.class);
        intent.setAction(RecentsWidgetProvider.CLICK_ACTION);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
