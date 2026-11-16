package com.nodemore.lms.common;

import com.nodemore.lms.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Human readable date/time in the platform time zone (used in notification and e-mail text). */
@Component
public class DateFormats {
    private final DateTimeFormatter fmt;

    public DateFormats(AppProperties props) {
        this.fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of(props.getTimezone()));
    }

    public String format(Instant instant) {
        return instant == null ? "" : fmt.format(instant);
    }
}
