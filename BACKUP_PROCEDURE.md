# Pre-Integration Backup Procedure

## ⚠️ IMPORTANT: Backup Old Version First

Before copying the new pitch-perfector, we need to safely backup/remove the old version to avoid filename conflicts.

---

## 🔄 Safe Replacement Steps

### Step 1: Backup Current Version (Recommended)

```bash
cd /Users/ricardomendes/Desktop/VoxLab_web/APP\ copy\ 2/app

# Rename old version with timestamp
mv pitch-perfector2 pitch-perfector2-backup-$(date +%Y%m%d)

# Or move to a backup location
mv pitch-perfector2 ~/Desktop/pitch-perfector2-old
```

### Step 2: Verify Removal

```bash
# Make sure it's gone
ls -la | grep pitch-perfector
# Should show nothing or only the backup
```

### Step 3: Copy New Version

```bash
# Now safe to copy new version
cp -r /path/to/new/pitch-perfector2 ./pitch-perfector2
```

### Step 4: Verify Structure

```bash
ls -la pitch-perfector2/
# Should see: src/, package.json, vite.config.ts, etc.
```

---

## 🗂️ What Files Might Conflict

Common filenames between versions:
- `App.tsx`
- `index.tsx`
- `index.html`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- Any component files
- Asset files in `public/`

**Why backup is critical:**
- Prevents file overwrites
- Allows rollback if needed
- Avoids build errors from mixed versions

---

## 🧹 Alternative: Complete Clean Install

If you want a completely fresh start:

```bash
# 1. Remove old version
rm -rf pitch-perfector2

# 2. Copy new version
cp -r /path/to/new/pitch-perfector2 ./pitch-perfector2

# 3. Install dependencies
cd pitch-perfector2
npm install

# 4. Build
npm run build
```

---

## 📦 Quick Backup Script

Save this as `backup-pitch-perfector.sh`:

```bash
#!/bin/bash

echo "🔄 Backing up pitch-perfector2..."

# Get current directory
APP_DIR="/Users/ricardomendes/Desktop/VoxLab_web/APP copy 2/app"
cd "$APP_DIR"

# Create backup name with timestamp
BACKUP_NAME="pitch-perfector2-backup-$(date +%Y%m%d-%H%M%S)"

# Move old version
if [ -d "pitch-perfector2" ]; then
    mv pitch-perfector2 "$BACKUP_NAME"
    echo "✅ Backed up to: $BACKUP_NAME"
else
    echo "⚠️  No pitch-perfector2 folder found"
fi

echo "✅ Ready for new version!"
```

Run with:
```bash
chmod +x backup-pitch-perfector.sh
./backup-pitch-perfector.sh
```

---

## ✅ Recommended Workflow

1. **Before you start:**
   ```bash
   # Backup current version
   mv pitch-perfector2 pitch-perfector2-old
   ```

2. **Copy new version:**
   ```bash
   # Copy your new version here
   cp -r ~/Desktop/new-pitch-perfector ./pitch-perfector2
   ```

3. **Verify and build:**
   ```bash
   cd pitch-perfector2
   npm install
   npm run build
   ```

4. **Test in VoxLab**

5. **If everything works:**
   ```bash
   # Safely remove old backup (optional)
   rm -rf ../pitch-perfector2-old
   ```

6. **If something breaks:**
   ```bash
   # Restore old version
   rm -rf pitch-perfector2
   mv pitch-perfector2-old pitch-perfector2
   ```

---

## 🎯 Ready Checklist

Before copying new version:
- [ ] Server is stopped (or will restart after)
- [ ] Old pitch-perfector2 is backed up/renamed
- [ ] Path to new version is confirmed
- [ ] Have write permissions to app directory

After copying new version:
- [ ] `pitch-perfector2/` exists
- [ ] Contains `package.json`, `vite.config.ts`, etc.
- [ ] No old files mixed in
- [ ] Ready to `npm install`

---

**Safe to proceed when old version is backed up!** 🚀
