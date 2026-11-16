package com.nodemore.lms.live;

import com.nodemore.lms.common.ApiException;

import java.net.URI;
import java.util.Locale;

/** Validates external meeting links and recognises the service for a friendly label. */
public final class MeetingLinks {
    private MeetingLinks() {}

    /** @return the cleaned https URL; throws error.meeting_url_invalid otherwise. */
    public static String clean(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();
        if (!s.toLowerCase(Locale.ROOT).startsWith("http")) s = "https://" + s;
        try {
            URI uri = URI.create(s);
            // Only https links: blocks javascript:, data: and other dangerous schemes.
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || !uri.getHost().contains(".")) {
                throw ApiException.badRequest("error.meeting_url_invalid");
            }
            if (s.length() > 1000) throw ApiException.badRequest("error.meeting_url_invalid");
            return uri.toString();
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("error.meeting_url_invalid");
        }
    }

    public static String provider(String url) {
        if (url == null) return null;
        String host;
        try {
            host = URI.create(url).getHost().toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            return "OTHER";
        }
        if (host.endsWith("zoom.us") || host.endsWith("zoom.com")) return "ZOOM";
        if (host.equals("meet.google.com")) return "GOOGLE_MEET";
        if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) return "TEAMS";
        return "OTHER";
    }
}
