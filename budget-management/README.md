# Budget Management API

## Initial administrator

On the first startup after applying the user migration, set `APP_AUTH_BOOTSTRAP_EMAIL` and `APP_AUTH_BOOTSTRAP_PASSWORD`. The application creates that account as `SUPER_ADMIN` if the email is not already registered. Use a temporary password with at least 10 characters. Change it at the first sign in, then remove the bootstrap password from the runtime environment.

For PowerShell, set these values in the shell that starts Spring Boot:

```powershell
$env:APP_AUTH_BOOTSTRAP_EMAIL = "admin@example.gov"
$env:APP_AUTH_BOOTSTRAP_PASSWORD = "your-temporary-password"
mvn spring-boot:run
```

Flyway creates the `app_users` table automatically. The first super admin creates accounts in the frontend under **User Management**.

## Roles

- `SUPER_ADMIN`: full application and user administration access.
- `ADMIN`: can submit expenditure input only for assigned project and/or office allocations.
- `USER`: read-only report access.

Passwords are stored as BCrypt hashes. New accounts must change the supplied password before using the application. Signed-in sessions use the API session cookie.
