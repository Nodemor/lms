# Deploying NodeMor Academy to the Hostinger VPS

The finished setup:

```
GitHub (Nodemor/lms, main branch protected)
   │ push / merged pull request
   ▼ webhook
Jenkins  (https://ci.nodemor.io)  ── builds, runs tests, deploys
   ▼
Docker on the VPS:  Caddy (HTTPS) → frontend (nginx) → backend (Spring Boot) → PostgreSQL + Redis
   ▲
https://academy.nodemor.io
```

Server: Hostinger KVM 2 (`srv2157198.hstgr.cloud`). Replace `VPS_IP` below with your VPS IP address
(hPanel → VPS → Overview).

---

## Step 0 – Verify the domain (urgent)
`nodemor.io` shows **Pending verification**. Open the email from Hostinger sent to the domain owner's address
and click the verification link, otherwise the domain is suspended. hPanel → Domains → nodemor.io shows the status.

## Step 1 – DNS records
hPanel → Domains → nodemor.io → **DNS / Nameservers** → DNS records. Add:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `academy` | `VPS_IP` | 3600 |
| A | `ci`  | `VPS_IP` | 3600 |

Email records are added in Step 7. Check propagation: `nslookup academy.nodemor.io` must return the VPS IP.

## Step 2 – Prepare the VPS
hPanel → VPS → **OS & Panel**: Ubuntu 24.04 (the "Ubuntu 24.04 with Docker" template saves a step).

From your computer (PowerShell works):
```bash
ssh root@VPS_IP
```
On the server:
```bash
# updates + basics
apt update && apt -y upgrade
apt -y install git ufw fail2ban unattended-upgrades

# Docker (skip if you chose the Docker template)
curl -fsSL https://get.docker.com | sh

# a non-root admin user
adduser deploy
usermod -aG sudo,docker deploy

# firewall: only SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# automatic security updates
dpkg-reconfigure -plow unattended-upgrades
```
SSH keys instead of passwords (recommended): on your PC run `ssh-keygen -t ed25519`, then
`type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh deploy@VPS_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`.
After confirming key login works, set `PasswordAuthentication no` and `PermitRootLogin no` in
`/etc/ssh/sshd_config`, then `systemctl restart ssh`.

Also enable the **firewall** and **weekly snapshots/backups** for the VPS in hPanel.

## Step 3 – Server folders and the secret settings file
```bash
sudo mkdir -p /opt/nodemore/backups /var/jenkins_home
sudo chown 1000:1000 /var/jenkins_home          # Jenkins runs as uid 1000
sudo git clone https://github.com/Nodemor/lms.git /opt/nodemore/repo   # use a deploy key if the repo is private (Step 5)
sudo cp /opt/nodemore/repo/deploy/.env.production.example /opt/nodemore/.env
sudo nano /opt/nodemore/.env                    # fill every CHANGE_ME (generate with: openssl rand -base64 48)
sudo chmod 640 /opt/nodemore/.env
sudo chown root:1000 /opt/nodemore/.env         # readable by Jenkins, not by other users
```

## Step 4 – Start Caddy (HTTPS) and Jenkins
```bash
cd /opt/nodemore/repo/deploy/infra
sudo DOCKER_GID=$(getent group docker | cut -d: -f3) docker compose up -d --build
```
Caddy fetches HTTPS certificates for `academy.nodemor.io` and `ci.nodemor.io` automatically (DNS from Step 1 must
already work). Get the Jenkins unlock password:
```bash
sudo cat /var/jenkins_home/secrets/initialAdminPassword
```
Open **https://ci.nodemor.io** → paste it → **Install suggested plugins** → create your admin user.
Then: Manage Jenkins → Security → **Authorization: Logged-in users can do anything** (untick
"Allow anonymous read access"); **Security Realm: Jenkins' own user database** with **"Allow users to sign up" OFF**.

## Step 5 – Connect Jenkins to GitHub
1. **Deploy key (read-only)** on the server:
   ```bash
   sudo -u '#1000' ssh-keygen -t ed25519 -N "" -f /var/jenkins_home/github_deploy_key
   sudo cat /var/jenkins_home/github_deploy_key.pub
   ```
   GitHub → Nodemor/lms → Settings → **Deploy keys** → Add → paste → leave **"Allow write access" unticked**.
2. Jenkins → Manage Jenkins → Credentials → (global) → Add: **SSH Username with private key**,
   ID `github-deploy-key`, username `git`, paste the content of `/var/jenkins_home/github_deploy_key`.
   Manage Jenkins → Security → **Git Host Key Verification**: *Accept first connection*.
3. New Item → name `nodemore-lms` → **Pipeline** →
   - Build Triggers: **GitHub hook trigger for GITScm polling**
   - Pipeline: *Pipeline script from SCM* → Git → `git@github.com:Nodemor/lms.git`, credentials
     `github-deploy-key`, branch `*/main`, script path `Jenkinsfile`.
4. GitHub → Settings → **Webhooks** → Add: Payload URL `https://ci.nodemor.io/github-webhook/`,
   content type `application/json`, event **Just the push event**.
5. Click **Build Now** once in Jenkins. The first build takes ~10 minutes (downloads and compiles everything).
   When it is green, open **https://academy.nodemor.io** and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

From now on: **push or merge to `main` → Jenkins builds → tests run → if everything passes the site updates.**
If the build or a test fails, the running site is not touched.

## Step 6 – Protect the GitHub repository
GitHub → Nodemor/lms → Settings → **Rules → Rulesets → New branch ruleset**:
- Name `protect-main`, Enforcement **Active**, Target: **Default branch**
- ✅ **Restrict deletions**
- ✅ **Block force pushes**
- ✅ **Require a pull request before merging** (1 approval if more than one developer; dismiss stale approvals)
- ✅ **Require linear history**
- ✅ Require signed commits (optional, strongest)
- Bypass list: empty (or only the organisation owner for emergencies)

Settings → **Code security**: enable **Dependabot alerts**, **Dependabot security updates**,
**Secret scanning** and **Push protection** (blocks pushes that contain passwords/keys).
Organisation settings → Authentication security: **Require two-factor authentication** for all members.

Why this blocks attacks: nobody can rewrite history or push straight to `main`; every change is a reviewed
pull request; secrets can't be pushed; and Jenkins only deploys `main`, after the build and tests pass.

## Step 7 – Email (academy Gmail: nodemoracademy@gmail.com)
1. Sign in to nodemoracademy@gmail.com → **myaccount.google.com/security** → turn on **2-Step Verification**.
2. Open **myaccount.google.com/apppasswords** → App name `NodeMor Academy` → **Create** → copy the 16-letter password.
3. In `/opt/nodemore/.env`: `SMTP_USER=nodemoracademy@gmail.com`, `SMTP_PASSWORD=` the 16 letters **without spaces**
   (the other Gmail lines are already filled in). Then Jenkins → **Build Now**.

Gmail sends about **500 e-mails per day**. With `MAIL_CLASS_UPDATES=false` the academy e-mails only what matters
(verification codes, password resets, slips to review and join requests for teachers, payment approved/rejected for
students, package activation). New lessons, notes, reminders and announcements still reach everyone in the app (🔔).
No DNS records are needed for Gmail sending. If you ever need more volume, switch to Amazon SES (only `.env` changes).

## Step 8 – Backups
```bash
sudo cp /opt/nodemore/repo/deploy/backup.sh /opt/nodemore/backup.sh && sudo chmod 700 /opt/nodemore/backup.sh
sudo crontab -e        # add the line:
30 2 * * * /opt/nodemore/backup.sh >> /var/log/nodemore-backup.log 2>&1
```
Daily database + uploads backup, kept 14 days, plus Hostinger's VPS snapshots. Copy a backup off the server
regularly (e.g. download weekly). Restore database: `docker exec -i nodemore-postgres pg_restore -U nodemore -d nodemore_lms --clean < db-DATE.dump`.

## Step 9 – Go-live checklist
- [ ] https://academy.nodemor.io loads with a padlock; http redirects to https
- [ ] Register teacher + student → verification emails arrive
- [ ] Create class, YouTube lesson, notes upload/download, Zoom live link, quiz, bank slip approval
- [ ] Super Admin: Platform settings → bank details, support email
- [ ] Add the 3 site photos to `frontend/public/images/` and push
- [ ] Jenkins: push a small change → site updates automatically
- [ ] Backups: run `/opt/nodemore/backup.sh` once by hand and check `/opt/nodemore/backups`

## Day-to-day
| Task | How |
|---|---|
| Update the site | Merge a pull request into `main` |
| Undo a bad release | GitHub → revert the commit/PR → Jenkins redeploys the previous version |
| See logs | `docker logs -f nodemore-backend` |
| Restart the app | `docker restart nodemore-backend nodemore-frontend` |
| Change settings | edit `/opt/nodemore/.env` → Jenkins **Build Now** |
