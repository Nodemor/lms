package com.nodemore.lms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

/**
 * The frontend sends Accept-Language (en, si or ta) on every request so that
 * error messages and e-mails come back in the user's chosen language.
 */
@Configuration
public class LocaleConfig {

    public static final List<String> SUPPORTED = List.of("en", "si", "ta");

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(Locale.ENGLISH, Locale.forLanguageTag("si"), Locale.forLanguageTag("ta")));
        resolver.setDefaultLocale(Locale.ENGLISH);
        return resolver;
    }

    public static String normalize(String lang) {
        if (lang == null) return "en";
        String l = lang.toLowerCase(Locale.ROOT);
        return SUPPORTED.contains(l) ? l : "en";
    }
}
