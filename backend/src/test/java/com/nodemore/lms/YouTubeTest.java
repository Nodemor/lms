package com.nodemore.lms;

import com.nodemore.lms.lesson.YouTube;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class YouTubeTest {
    private static final String ID = "dQw4w9WgXcQ";

    @Test
    void acceptsCommonLinkFormats() {
        assertEquals(ID, YouTube.extractId("https://www.youtube.com/watch?v=" + ID));
        assertEquals(ID, YouTube.extractId("https://www.youtube.com/watch?feature=share&v=" + ID + "&t=30s"));
        assertEquals(ID, YouTube.extractId("https://youtu.be/" + ID + "?si=abc123"));
        assertEquals(ID, YouTube.extractId("youtu.be/" + ID));
        assertEquals(ID, YouTube.extractId("https://m.youtube.com/watch?v=" + ID));
        assertEquals(ID, YouTube.extractId("https://www.youtube.com/embed/" + ID));
        assertEquals(ID, YouTube.extractId("https://www.youtube.com/shorts/" + ID));
        assertEquals(ID, YouTube.extractId("https://www.youtube.com/live/" + ID + "?feature=share"));
        assertEquals(ID, YouTube.extractId(ID));
    }

    @Test
    void rejectsOtherLinks() {
        assertNull(YouTube.extractId("https://example.com/watch?v=" + ID));
        assertNull(YouTube.extractId("https://www.youtube.com/watch?v=short"));
        assertNull(YouTube.extractId("not a link"));
        assertNull(YouTube.extractId(""));
        assertNull(YouTube.extractId(null));
    }
}
