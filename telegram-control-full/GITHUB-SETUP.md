# GitHub quick setup (PowerShell)

Open PowerShell in this folder:

```powershell
cd "D:\telegram-control\telegram-control-full"
git init
git add .
git commit -m "Initial production Telegram Mini App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/telegram-control.git
git push -u origin main
```

Create the GitHub repository first and keep it empty (do not add README or .gitignore there).

Before `git add .`, verify secrets are not present:

```powershell
Get-ChildItem -Force .env.local, .env -ErrorAction SilentlyContinue
```

Those files are ignored by `.gitignore`.
