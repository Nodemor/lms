# Security policy

Please report security problems privately to **security@nodemor.io**. Do not open public issues for vulnerabilities.

Repository rules:
- `main` is protected: no force pushes, no deletion, changes only through reviewed pull requests.
- Every push to `main` is built and tested by Jenkins before deployment.
- Secrets live only in `/opt/nodemore/.env` on the server, never in Git.
