package com.nodemore.lms;

import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.storage.FileKeys;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class FileKeysTest {

    @Test
    void rejectsPathTraversal() {
        assertFalse(FileKeys.isSafe("../etc/passwd"));
        assertFalse(FileKeys.isSafe("t/a/../../b"));
        assertFalse(FileKeys.isSafe("/abs/path"));
        assertTrue(FileKeys.isSafe("t/" + UUID.randomUUID() + "/general/thumbnails/x.png"));
    }

    @Test
    void tenantPrefixIsEnforced() {
        UUID teacherA = UUID.randomUUID();
        UUID teacherB = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        String key = FileKeys.teacherKey(teacherA, classId, "lessons", "mp4");
        assertDoesNotThrow(() -> FileKeys.requireTeacherKey(key, teacherA, classId, "lessons"));
        assertThrows(ApiException.class, () -> FileKeys.requireTeacherKey(key, teacherB, classId, "lessons"));
        assertThrows(ApiException.class, () -> FileKeys.requireTeacherKey(key, teacherA, UUID.randomUUID(), "lessons"));
    }

    @Test
    void cleansFileNamesButKeepsSinhalaAndTamil() {
        assertEquals("සටහන් 1.pdf", FileKeys.cleanName("සටහන් 1.pdf"));
        assertEquals("குறிப்பு.pdf", FileKeys.cleanName("குறிப்பு.pdf"));
        assertEquals("a_b.pdf", FileKeys.cleanName("a+b.pdf"));
    }
}
