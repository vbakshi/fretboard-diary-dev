# Push this project to GitHub ([@vbakshi](https://github.com/vbakshi))

The git remote **`origin`** is already set to:

`https://github.com/vbakshi/guitar_lesson_dairy.git`

## 1. Create the empty repo on GitHub

1. Open **[github.com/new](https://github.com/new)** while logged in as **vbakshi**.
2. **Repository name:** `guitar_lesson_dairy` (must match the URL above).
3. Choose **Public** or **Private**.
4. **Do not** add a README, `.gitignore`, or license (this project already has them).
5. Click **Create repository**.

## 2. Push from your computer

In the project folder:

```bash
cd /Users/vinayak/projects/guitar_lesson_dairy
git push -u origin main
```

If Git asks you to sign in, use a [Personal Access Token](https://github.com/settings/tokens) as the password (HTTPS), or switch the remote to SSH:

```bash
git remote set-url origin git@github.com:vbakshi/guitar_lesson_dairy.git
git push -u origin main
```

After a successful push, the repo will be at **<https://github.com/vbakshi/guitar_lesson_dairy>**.
