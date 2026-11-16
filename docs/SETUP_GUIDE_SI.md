# NodeMor Academy – සම්පූර්ණ මාර්ගෝපදේශය (සිංහල)

ඔබේ පරිගණකයේ run කිරීම, පරීක්ෂා කිරීම, GitHub, Hostinger server එකට දැමීම සහ සජීවී පරීක්ෂාව – පිළිවෙළට.

| කොටස | කරන දේ |
|---|---|
| 1 | අවශ්‍ය මෘදුකාංග |
| 2 | ඔබේ පරිගණකයේ run කිරීම |
| 3 | පරිගණකයේ පරීක්ෂා කිරීම |
| 4 | GitHub එකට දැමීම |
| 5 | Gmail App Password |
| 6 | Domain සහ DNS |
| 7 | Server එක සූදානම් කිරීම |
| 8 | Code සහ රහස් සැකසුම් server එකට |
| 9 | HTTPS සහ Jenkins |
| 10 | පළමු Deploy එක – Link එක |
| 11 | සජීවී site එක පරීක්ෂා කිරීම |
| 12 | GitHub ආරක්ෂාව |
| 13 | Backup |
| 14 | එදිනෙදා භාවිතය සහ ගැටලු විසඳීම |

---

## කොටස 1 – අවශ්‍ය මෘදුකාංග (ඔබේ පරිගණකයේ)

| මෘදුකාංගය | පරීක්ෂා කරන command එක |
|---|---|
| Java 17 | `java -version` |
| Maven | `mvn -v` |
| Node.js 20+ | `node -v` |
| pnpm | `pnpm -v` (නැත්නම් `corepack enable`) |
| PostgreSQL 13+ | SQL Shell (psql) Start menu එකේ |
| Git | `git --version` |

---

## කොටස 2 – ඔබේ පරිගණකයේ run කිරීම

### 2.1 Zip එක දැමීම
1. පැරණි `nodemore-lms` folder එකක් ඇත්නම් එය `nodemore-lms-old` ලෙස **rename** කරන්න (මකන්න එපා).
2. `nodemore-lms.zip` → Right-click → **Extract All** → `D:\New folder (39)\`.

### 2.2 Database (එක් වරක් පමණයි – කලින් සාදා ඇත්නම් මඟ හරින්න)
Start menu → **SQL Shell (psql)** → Enter ඔබමින් ගොස් postgres මුරපදය දෙන්න:
```sql
CREATE USER nodemore WITH PASSWORD 'MyDbPass123';
CREATE DATABASE nodemore_lms OWNER nodemore;
\q
```

### 2.3 Backend
```powershell
cd "D:\New folder (39)\nodemore-lms\backend"
powershell -ExecutionPolicy Bypass -File .\run-local.ps1
```
`Started NodemoreLmsApplication` දකින තුරු රැඳී සිටින්න. මෙම window එක **විවෘතව තබන්න**.

### 2.4 Frontend (නව PowerShell window එකක)
```powershell
cd "D:\New folder (39)\nodemore-lms\frontend"
pnpm install
pnpm dev
```

### 2.5 විවෘත කිරීම
Browser → **http://localhost:5173** → **Ctrl + F5**.
Admin: `admin@nodemore.local` / `Admin@12345`

**Local mode එකේදී ලියාපදිංචි වීමේ කේත email නොව backend window එකේ පෙන්වයි.**

---

## කොටස 3 – පරිගණකයේ පරීක්ෂා කිරීම (Checklist)

ගුරු ගිණුම **සාමාන්‍ය window** එකේ, සිසු ගිණුම **Incognito window** (Ctrl + Shift + N) එකේ භාවිත කරන්න.

**Admin**
- [ ] Admin ලෙස පිවිස **Platform settings** → **Bank details** සහ **WhatsApp number** (94719247009) පුරවා Save.

**ගුරුවරයා**
- [ ] Sign out → **Get started** → **මම ගුරුවරයෙක්** → ලියාපදිංචි → backend window එකේ කේතය ඇතුළත් කරන්න.
- [ ] **Settings** → හැඳින්වීම, විෂයයන්, **බැංකු විස්තර** එක් කරන්න.
- [ ] **My classes → New class** → මාසික ගාස්තුවක් සහිතව සාදා **Publish** කරන්න.
- [ ] Overview හි **Class QR** → **Download QR** සහ **Print poster** පරීක්ෂා කරන්න.
- [ ] **Announcements** → නිවේදනයක් පළ කරන්න.
- [ ] **Lessons** → YouTube සබැඳියකින් පාඩමක් + දේශන සටහන් (PDF).
- [ ] **Notes** → PDF එකක් උඩුගත කරන්න.
- [ ] **Live classes** → Zoom/Meet සබැඳියක් සහිතව එකක්, සහ **In person (QR check-in)** එකක් සාදන්න.
- [ ] **Quizzes** → ප්‍රශ්න 2–3ක ප්‍රශ්නාවලියක් → Save and publish.
- [ ] **My plan** → **Request on WhatsApp** බොත්තම WhatsApp විවෘත කරන බව බලන්න.

**සිසුවා (Incognito)**
- [ ] **මම සිසුවෙක්** ලෙස ලියාපදිංචි → **Find classes** → පන්තිය → **Join class**.
- [ ] පන්තිය අගුළු වැටී ඇත → **Fees** → රිසිට්පතේ ඡායාරූපයක් උඩුගත කර **Send slip to teacher**.

**ගුරුවරයා**
- [ ] 🔔 දැනුම්දීම → **Payments** → **Slip** බලා **Confirm**.

**සිසුවා**
- [ ] පන්තිය විවෘතයි: පාඩම නරඹන්න, සටහන් බාගන්න, ප්‍රශ්නාවලිය කරන්න, **My results** බලන්න.

**භාෂා සහ දුරකථනය**
- [ ] **සිං** සහ **தமி** ඔබා පිටු කිහිපයක් බලන්න.
- [ ] F12 → දුරකථන අයිකනය → දුරකථන ප්‍රමාණයෙන් පිටු බලන්න.

> QR **ස්කෑන් කිරීම දුරකථනයෙන්** පරීක්ෂා කළ හැක්කේ සජීවී site එකේදී පමණි (කොටස 11), මන්ද දුරකථනයට ඔබේ පරිගණකයේ `localhost` වෙත යා නොහැක.

---

## කොටස 4 – GitHub එකට දැමීම

```powershell
cd "D:\New folder (39)\nodemore-lms"
```
**පළමු වතාව නම්:**
```powershell
git init -b main
git add .
git commit -m "NodeMor Academy v1.0"
git remote add origin https://github.com/Nodemor/lms.git
git push -u origin main
```
"rejected" error එකක් ආවොත්:
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```
**කලින් push කර ඇත්නම්:** `nodemore-lms-old` හි සැඟවුණු **`.git`** folder එක (File Explorer → View → Show → Hidden items) නව folder එකට copy කර:
```powershell
git add .
git commit -m "NodeMor Academy update"
git push
```
**පරීක්ෂාව:** github.com/Nodemor/lms හි `backend`, `frontend`, `Jenkinsfile`, `DEPLOY.md` පෙනිය යුතුයි.
`.env` වැනි රහස් ගොනු GitHub එකට **නොයන ලෙස** සකසා ඇත.

---

## කොටස 5 – Gmail App Password (Emails යැවීමට)

1. **nodemoracademy@gmail.com** එකෙන් ලොග් වී **myaccount.google.com/security** → **2-Step Verification** සක්‍රිය කරන්න.
2. **myaccount.google.com/apppasswords** → App name `NodeMor Academy` → **Create**.
3. ලැබෙන **අකුරු 16** ලියාගන්න (සාමාන්‍ය Gmail මුරපදය නොවේ). කොටස 8.3 හිදී භාවිත කරයි.

**Email යන්නේ:** ලියාපදිංචි කේත, මුරපද යළි සැකසීම, රිසිට්පත් සමාලෝචනයට (ගුරුවරයාට), එක්වීමේ ඉල්ලීම් (ගුරුවරයාට), ගෙවීම අනුමත/ප්‍රතික්ෂේප (සිසුවාට), පැකේජ සක්‍රිය කිරීම.
**App එකේ 🔔 පමණි:** නව පාඩම්, සටහන්, මතක් කිරීම්, නිවේදන (Gmail දිනකට ~500 සීමාව ආරක්ෂා කිරීමට).

---

## කොටස 6 – Domain සහ DNS (Hostinger hPanel)

### 6.1 Domain verify (හදිසියි!)
hPanel → **Domains → nodemor.io → Domain Ownership** → verification email එක යළි යවා inbox එකේ link එක ක්ලික් කරන්න.

### 6.2 VPS IP සොයාගැනීම
hPanel → **VPS → srv2157198 → Overview** → **IP address** ලියාගන්න (පහත `VPS_IP`). එහිම **Root password** සකසන්න.

### 6.3 DNS records
hPanel → **Domains → nodemor.io → DNS / Nameservers → DNS records** → **Add Record**:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `academy` | `VPS_IP` | 3600 |
| A | `ci` | `VPS_IP` | 3600 |

විනාඩි 10–30කින් පසු PowerShell: `nslookup academy.nodemor.io` → VPS IP එක පෙන්විය යුතුයි.

---

## කොටස 7 – Server එක සූදානම් කිරීම

### 7.1 Server එකට ඇතුළු වීම
```powershell
ssh root@VPS_IP
```
`yes` → root password (අකුරු නොපෙනීම සාමාන්‍යයි). **Paste = mouse right-click.**

### 7.2 මෘදුකාංග සහ Firewall (එකින් එක run කරන්න)
```bash
apt update && apt -y upgrade
```
```bash
apt -y install git ufw fail2ban
```
```bash
curl -fsSL https://get.docker.com | sh
```
```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable
```

---

## කොටස 8 – Code සහ රහස් සැකසුම් server එකට

### 8.1 GitHub යතුර
```bash
mkdir -p /opt/nodemore/backups /var/jenkins_home && chown 1000:1000 /var/jenkins_home
sudo -u '#1000' ssh-keygen -t ed25519 -N "" -f /var/jenkins_home/github_deploy_key
cat /var/jenkins_home/github_deploy_key.pub
```
පෙන්වන `ssh-ed25519 ...` පේළිය copy → GitHub → **Nodemor/lms → Settings → Deploy keys → Add deploy key** → paste → **"Allow write access" ටික් නොකරන්න** → **Add key**.

### 8.2 Code එක download කිරීම
```bash
GIT_SSH_COMMAND="ssh -i /var/jenkins_home/github_deploy_key -o StrictHostKeyChecking=accept-new" git clone git@github.com:Nodemor/lms.git /opt/nodemore/repo
```

### 8.3 රහස් සැකසුම් ගොනුව (.env)
```bash
cp /opt/nodemore/repo/deploy/.env.production.example /opt/nodemore/.env
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
```
ලැබෙන අගයන් 3 copy කරගන්න. ඉන්පසු `nano /opt/nodemore/.env`:

| පේළිය | දැමිය යුතු දේ |
|---|---|
| `DB_PASSWORD=` | රහස් අගය 1 |
| `JWT_SECRET=` | රහස් අගය 2 |
| `STORAGE_SIGNING_SECRET=` | රහස් අගය 3 |
| `ADMIN_EMAIL=` | Super Admin ඊමේල් |
| `ADMIN_PASSWORD=` | ශක්තිමත් මුරපදයක් (අක්ෂර 10+) |
| `SMTP_PASSWORD=` | Gmail App Password අකුරු 16 (**හිස්තැන් නැතිව**) |

`PUBLIC_URL=https://academy.nodemor.io`, `SMTP_USER=nodemoracademy@gmail.com` දැනටමත් ඇත.
සුරැකීම: **Ctrl + O → Enter → Ctrl + X**. ඉන්පසු:
```bash
chmod 640 /opt/nodemore/.env && chown root:1000 /opt/nodemore/.env
```

---

## කොටස 9 – HTTPS සහ Jenkins

### 9.1 ආරම්භ කිරීම
```bash
cd /opt/nodemore/repo/deploy/infra
DOCKER_GID=$(getent group docker | cut -d: -f3) docker compose up -d --build
cat /var/jenkins_home/secrets/initialAdminPassword
```
අවසාන මුරපදය copy කරන්න.

### 9.2 Jenkins සැකසීම
1. **https://ci.nodemor.io** → මුරපදය paste → **Install suggested plugins** → ඔබේ Jenkins admin ගිණුම සාදන්න.
2. **Manage Jenkins → Security**: "Allow users to sign up" **ඉවත් කරන්න**, "Allow anonymous read access" **ඉවත් කරන්න**, Git Host Key Verification → **Accept first connection** → **Save**.

### 9.3 Jenkins ↔ GitHub
1. Server එකේ `cat /var/jenkins_home/github_deploy_key` → සම්පූර්ණ text එක copy.
2. Jenkins → **Manage Jenkins → Credentials → Global → Add Credentials** → **SSH Username with private key** → ID `github-deploy-key`, Username `git`, Private Key **Enter directly** → paste → **Create**.
3. **New Item** → `nodemore-lms` → **Pipeline** → OK:
   - ✅ **GitHub hook trigger for GITScm polling**
   - Pipeline script from SCM → Git → `git@github.com:Nodemor/lms.git` → `github-deploy-key` → Branch `*/main` → Script Path `Jenkinsfile` → **Save**
4. GitHub → **Settings → Webhooks → Add webhook** → `https://ci.nodemor.io/github-webhook/` → `application/json` → **Just the push event** → **Add**.

---

## කොටස 10 – පළමු Deploy එක 🚀

1. Jenkins → `nodemore-lms` → **Build Now** (පළමු වතාවට විනාඩි 10–15).
2. Build අංකය → **Console Output** → **Finished: SUCCESS** ✅
3. විවෘත කරන්න: **https://academy.nodemor.io**
4. `.env` හි `ADMIN_EMAIL` / `ADMIN_PASSWORD` වලින් පිවිසෙන්න.

---

## කොටස 11 – සජීවී Site එක පරීක්ෂා කිරීම

- [ ] 🔒 padlock (HTTPS) පෙනේ.
- [ ] Admin → **Platform settings** → බැංකු විස්තර, WhatsApp (94719247009), Support email (nodemoracademy@gmail.com).
- [ ] නව ගුරු ගිණුමක් → **කේතය Gmail මගින් ලැබේ** (spam folder එකද බලන්න).
- [ ] කොටස 3 checklist එකම මෙහිද කරන්න.
- [ ] **Class QR** → ඔබේ **දුරකථන කැමරාවෙන් ස්කෑන්** → පන්ති පිටුව සහ උපදේශක විස්තර විවෘත වේ.
- [ ] **In person** පන්තිය → **Show check-in QR** (laptop තිරයේ) → සිසු ගිණුමකින් ලොග් වූ දුරකථනයෙන් ස්කෑන් → **"ඔබගේ පැමිණීම සටහන් විය!"** → laptop තිරයේ නම දිස් වේ.
- [ ] සිසුවා රිසිට්පත උඩුගත කළ විට **ගුරුවරයාට email එකක්** එයි; අනුමත කළ විට **සිසුවාට email එකක්** එයි.
- [ ] **Auto update:** ඔබේ පරිගණකයේ කුඩා වෙනසක් කර push කරන්න → Jenkins ස්වයංක්‍රීයව build වී site එක update වේ.

---

## කොටස 12 – GitHub ආරක්ෂාව (පළමු push එකෙන් පසු)

GitHub → **Nodemor/lms → Settings → Rules → Rulesets → New branch ruleset**:
- Name `protect-main`, **Active**, Target: **default branch**
- ✅ **Restrict deletions** ✅ **Block force pushes** ✅ **Require a pull request before merging** ✅ **Require linear history** → **Create**

**Settings → Code security**: Dependabot alerts, Dependabot security updates, Secret scanning, **Push protection** – සියල්ල **Enable**.
**Organization settings → Authentication security**: ✅ **Require two-factor authentication**.

---

## කොටස 13 – දිනපතා Backup

```bash
cp /opt/nodemore/repo/deploy/backup.sh /opt/nodemore/backup.sh && chmod 700 /opt/nodemore/backup.sh
/opt/nodemore/backup.sh
crontab -e
```
(editor ඇසුවොත් `1`) – අවසානයට එක් කර සුරකින්න:
```
30 2 * * * /opt/nodemore/backup.sh >> /var/log/nodemore-backup.log 2>&1
```
hPanel → VPS → **Snapshots & Backups** ද සක්‍රිය කරන්න.

---

## කොටස 14 – එදිනෙදා භාවිතය සහ ගැටලු විසඳීම

| අවශ්‍යතාව | කරන ආකාරය |
|---|---|
| Site එක update කිරීම | Pull Request එකක් **main** එකට merge කරන්න – Jenkins ස්වයංක්‍රීයව deploy කරයි |
| වැරදි update එකක් ආපසු හැරවීම | GitHub → commit/PR එක **Revert** කරන්න |
| ගුරුවරයෙකුට පැකේජයක් දීම | WhatsApp ඉල්ලීමෙන් පසු Admin → **Users** → ගුරුවරයා → **Give plan** |
| සැකසුම් වෙනස් කිරීම | `nano /opt/nodemore/.env` → සුරකින්න → Jenkins **Build Now** |
| Logs බැලීම | `docker logs -f nodemore-backend` (නවතන්න `Ctrl + C`) |
| App restart | `docker restart nodemore-backend nodemore-frontend` |

| ගැටලුව | විසඳුම |
|---|---|
| Site එක විවෘත නොවේ | `nslookup academy.nodemor.io` → VPS IP නොවේ නම් DNS (කොටස 6.3) පරීක්ෂා කර රැඳී සිටින්න |
| HTTPS / padlock නැත | DNS නිවැරදි වූ පසු `docker restart caddy` |
| Emails නොඑයි | App Password හිස්තැන් නැතිව දැමූ බව බලන්න; `docker logs nodemore-backend 2>&1 \| grep -i mail` |
| Jenkins build අසාර්ථකයි | Console Output හි අවසාන පේළි 30 copy කර එවන්න |
| QR ස්කෑන් කළ පසු "expired" | Laptop තිරයේ නව කේතය නැවත ස්කෑන් කරන්න (තත්පර 30කට වරක් වෙනස් වේ) |

ගැටලුවක් ඇත්නම් **කොටස/පියවර අංකය** සහ **screenshot** එක එවන්න.
