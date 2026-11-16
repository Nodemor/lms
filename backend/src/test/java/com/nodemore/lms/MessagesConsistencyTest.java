package com.nodemore.lms;

import org.junit.jupiter.api.Test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/** Fails the build if English, Sinhala and Tamil server messages ever get out of sync. */
class MessagesConsistencyTest {

    private static Properties load(String name) throws Exception {
        Properties p = new Properties();
        try (var in = MessagesConsistencyTest.class.getResourceAsStream("/" + name)) {
            p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return p;
    }

    @Test
    void allLanguagesHaveTheSameKeys() throws Exception {
        Set<String> en = new TreeSet<>(load("messages.properties").stringPropertyNames());
        Set<String> si = new TreeSet<>(load("messages_si.properties").stringPropertyNames());
        Set<String> ta = new TreeSet<>(load("messages_ta.properties").stringPropertyNames());
        assertFalse(en.isEmpty());
        assertEquals(en, si, "Sinhala messages are missing or have extra keys");
        assertEquals(en, ta, "Tamil messages are missing or have extra keys");
    }

    @Test
    void noEmptyValues() throws Exception {
        for (String f : new String[]{"messages.properties", "messages_si.properties", "messages_ta.properties"}) {
            Properties p = load(f);
            for (String k : p.stringPropertyNames()) {
                assertFalse(p.getProperty(k).isBlank(), f + " has an empty value for " + k);
            }
        }
    }
}
