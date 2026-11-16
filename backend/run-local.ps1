# ============================================================================
# Nodemore LMS backend: local testing WITHOUT Docker (Windows PowerShell)
# Run:  powershell -ExecutionPolicy Bypass -File .\run-local.ps1
# Needs: Java 17+, Maven, PostgreSQL with database "nodemore_lms" and user "nodemore".
# ============================================================================

# ---- Edit these to match your PostgreSQL ----
$env:DB_URL      = "jdbc:postgresql://localhost:5432/nodemore_lms"
$env:DB_USER     = "nodemore"
$env:DB_PASSWORD = "MyDbPass123"

# ---- Test Super Admin (created on first start) ----
$env:ADMIN_EMAIL    = "admin@nodemore.local"
$env:ADMIN_PASSWORD = "Admin@12345"

Write-Host ""
Write-Host "Starting Nodemore LMS backend (local profile)..." -ForegroundColor Cyan
Write-Host "Verification codes and e-mails will be printed in this window." -ForegroundColor Yellow
Write-Host ""
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
