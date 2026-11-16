package com.nodemore.lms.lesson;

import java.net.URI;
import java.util.regex.Pattern;

/** Extracts the video id from any common YouTube link (watch, youtu.be, embed, shorts, live). */
public final class YouTube {
    private YouTube() {}

    private static final Pattern ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");

    public static String extractId(String input) {
        if (input == null) return null;
        String s = input.trim();
        if (ID.matcher(s).matches()) return s;
        try {
            URI uri = URI.create(s.startsWith("http") ? s : "https://" + s);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
            String path = uri.getPath() == null ? "" : uri.getPath();
            String candidate = null;
            if (host.endsWith("youtu.be")) {
                candidate = path.replaceFirst("^/", "").split("/")[0];
            } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
                if (path.equals("/watch") && uri.getRawQuery() != null) {
                    for (String part : uri.getRawQuery().split("&")) {
                        if (part.startsWith("v=")) candidate = part.substring(2);
                    }
                } else {
                    String[] seg = path.split("/");
                    if (seg.length >= 3 && (seg[1].equals("embed") || seg[1].equals("shorts") || seg[1].equals("live") || seg[1].equals("v"))) {
                        candidate = seg[2];
                    }
                }
            }
            return candidate != null && ID.matcher(candidate).matches() ? candidate : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public static String thumbnail(String id) {
        return id == null ? null : "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    }
}
