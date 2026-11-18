package com.govbudget.management.auth.service;

import com.govbudget.management.auth.entity.AppUser;
import com.govbudget.management.auth.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.Locale;

@Component
public class BootstrapSuperAdmin implements ApplicationRunner {
    private final AppUserRepository users; private final PasswordEncoder encoder;
    @Value("${app.auth.bootstrap-email:}") private String email;
    @Value("${app.auth.bootstrap-password:}") private String password;
    public BootstrapSuperAdmin(AppUserRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }
    @Override public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) return;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(normalized)) return;
        if (password.length() < 10) throw new IllegalStateException("APP_AUTH_BOOTSTRAP_PASSWORD must contain at least 10 characters");
        var user = new AppUser(); user.setEmail(normalized); user.setPasswordHash(encoder.encode(password));
        user.setRole("SUPER_ADMIN"); user.setMustChangePassword(true); users.save(user);
    }
}
