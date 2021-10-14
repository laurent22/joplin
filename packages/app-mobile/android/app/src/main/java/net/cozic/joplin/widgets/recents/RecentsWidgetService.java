package net.cozic.joplin.widgets.recents;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import net.cozic.joplin.R;

import java.util.List;

public class RecentsWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new RecentsWidgetDataViewsFactory(getApplicationContext(), intent);
    }

    private static class RecentsWidgetDataViewsFactory implements RemoteViewsService.RemoteViewsFactory {
        private List<RecentsWidgetData.NoteItem> notes;
        private Context context;
        private RecentsWidgetData recentsWidgetData;

        public RecentsWidgetDataViewsFactory(Context context, Intent intent) {
            this.context = context;
            recentsWidgetData = new RecentsWidgetData(context);
        }

        @Override
        public void onCreate() {
            notes = recentsWidgetData.readRecents();
        }

        @Override
        public void onDataSetChanged() {
            notes = recentsWidgetData.readRecents();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.recents_widget_item);
            rv.setTextViewText(R.id.recents_widget_item, notes.get(position).getTitle());
            rv.setOnClickFillInIntent(R.id.recents_widget_item, fillInIntent(notes.get(position).getId()));
            return rv;
        }

        private Intent fillInIntent(String noteId) {
            Bundle extras = new Bundle();
            extras.putString(RecentsWidgetProvider.NOTE_ID, noteId);
            Intent intent = new Intent();
            intent.putExtras(extras);
            return intent;
        }

        @Override
        public void onDestroy() {
            notes.clear();
        }

        @Override
        public int getCount() {
            return notes.size();
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        @Override
        public long getItemId(int position) {
            return notes.get(position).hashCode();
        }
    }
}
