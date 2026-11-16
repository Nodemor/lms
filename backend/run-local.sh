#!/usr/bin/env bash
# Nodemore LMS backend: local testing WITHOUT Docker (macOS / Linux)
export DB_URL="jdbc:postgresql://localhost:5432/nodemore_lms"
export DB_USER="nodemore"
export DB_PASSWORD="MyDbPass123"
export ADMIN_EMAIL="admin@nodemore.local"
export ADMIN_PASSWORD="Admin@12345"
mvn spring-boot:run -Dspring-boot.run.profiles=local
