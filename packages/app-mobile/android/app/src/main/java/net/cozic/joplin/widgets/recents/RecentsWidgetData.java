package net.cozic.joplin.widgets.recents;

import android.content.Context;
import android.content.Intent;

import net.cozic.joplin.widgets.WidgetData;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RecentsWidgetData extends WidgetData {
    public RecentsWidgetData(Context context) {
        super(context);
    }

    private void broadcastUpdate() {
        Intent intent = new Intent(context, RecentsWidgetProvider.class);
        intent.setAction(RecentsWidgetProvider.UPDATE_ACTION);
        context.sendBroadcast(intent);
    }

    public List<NoteItem> readRecents() {
        JSONObject data = readJSON();
        try {
            JSONArray notes = data.getJSONArray("notes");
            List<NoteItem> result = new ArrayList<>(notes.length());
            for (int i = 0; i < notes.length(); i++) {
                result.add(NoteItem.fromJSONObject(notes.getJSONObject(i)));
            }
            return result;
        } catch (JSONException e) {
            return Collections.emptyList();
        }
    }

    @Override
    protected void writeString(String value) {
        super.writeString(value);
        broadcastUpdate();
    }

    @Override
    protected String getKey() {
        return "RecentsWidget";
    }

    public static final class NoteItem {
        private String id;
        private String title;

        public static NoteItem fromJSONObject(JSONObject obj) throws JSONException {
            return new NoteItem(obj.getString("id"), obj.getString("title"));
        }

        public NoteItem(String id, String title) {
            this.id = id;
            this.title = title;
        }

        public String getId() {
            return id;
        }

        public String getTitle() {
            return title;
        }

        @Override
        public int hashCode() {
            return getId().hashCode();
        }
    }
}
