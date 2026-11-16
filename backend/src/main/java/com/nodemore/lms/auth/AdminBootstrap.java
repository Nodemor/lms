package com.nodemore.lms.auth;

import com.nodemore.lms.config.AppProperties;
import com.nodemore.lms.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Creates the first Super Admin from ADMIN_EMAIL / ADMIN_PASSWORD when none exists. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByRole(Role.SUPER_ADMIN)) return;
        String email = props.getAdmin().getEmail();
        String password = props.getAdmin().getPassword();
        if (email == null || email.isBlank() || password == null || password.length() < 10) {
            log.warn("No Super Admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) to create one on startup.");
            return;
        }
        if (users.existsByEmailIgnoreCase(email)) {
            log.warn("ADMIN_EMAIL {} is already used by a non-admin account; Super Admin not created.", email);
            return;
        }
        User u = new User();
        u.setEmail(email.trim().toLowerCase(Locale.ROOT));
        u.setFullName(props.getAdmin().getName());
        u.setPasswordHash(encoder.encode(password));
        u.setRole(Role.SUPER_ADMIN);
        u.setStatus(UserStatus.ACTIVE);
        u.setEmailVerified(true);
        users.save(u);
        log.info("Super Admin account created for {}", u.getEmail());
    }
}
