package com.nodemore.lms;

import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.live.MeetingLinks;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MeetingLinksTest {

    @Test
    void recognisesProviders() {
        assertEquals("ZOOM", MeetingLinks.provider(MeetingLinks.clean("https://us05web.zoom.us/j/8123456789?pwd=abc")));
        assertEquals("GOOGLE_MEET", MeetingLinks.provider(MeetingLinks.clean("meet.google.com/abc-defg-hij")));
        assertEquals("TEAMS", MeetingLinks.provider(MeetingLinks.clean("https://teams.microsoft.com/l/meetup-join/19%3ameeting")));
        assertEquals("TEAMS", MeetingLinks.provider(MeetingLinks.clean("https://teams.live.com/meet/9312345")));
        assertEquals("OTHER", MeetingLinks.provider(MeetingLinks.clean("https://whereby.com/myclass")));
    }

    @Test
    void blocksUnsafeOrBrokenLinks() {
        assertThrows(ApiException.class, () -> MeetingLinks.clean("javascript:alert(1)"));
        assertThrows(ApiException.class, () -> MeetingLinks.clean("http://zoom.us/j/1"));
        assertThrows(ApiException.class, () -> MeetingLinks.clean("https://localhost/x"));
        assertThrows(ApiException.class, () -> MeetingLinks.clean("https://exa mple.com"));
        assertNull(MeetingLinks.clean("   "));
    }
}
