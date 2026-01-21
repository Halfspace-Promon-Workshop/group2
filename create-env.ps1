# PowerShell script to create .env file with generated secrets
# Run this script: .\create-env.ps1

$envContent = @"
# Database
DATABASE_URL="postgresql://shield_monitor:shield_monitor_password@localhost:5432/shield_monitor?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# App URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Secrets (generated)
JWT_SECRET="Dfp7NXvaLk1/2FpdA8Or9gR5kcip5w2TFttbo5e/2uY="
ENCRYPTION_KEY="Bpwmj4it7rPSg50WHoQfEYiyIJ1h/dgWjbfCzvQe2Cg="

# VAPID Keys (generated)
VAPID_PUBLIC_KEY="BHY7V5-Y0mjjXtWxEVi_fhov7xklGPw0hpFtnKRKV4NLmo9clug_6OIQDWJOEmBvjqqeSkxLmsOBQqcvwjWlRsE"
VAPID_PRIVATE_KEY="XKQCOjGhhdUlvfL761RAlIR8XuvPBVBrJIuF5Zts2R8"
VAPID_SUBJECT="mailto:admin@example.com"
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host ".env file created successfully!" -ForegroundColor Green
