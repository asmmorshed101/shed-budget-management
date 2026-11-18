package com.govbudget.management.auth.service;

import com.govbudget.management.auth.repository.AppUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final AppUserRepository users;
    public AppUserDetailsService(AppUserRepository users) { this.users = users; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
        return User.withUsername(user.getEmail()).password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
                .disabled(!user.isEnabled()).build();
    }
}
