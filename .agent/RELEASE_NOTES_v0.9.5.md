# 🚀 Deployment Release Notes - v0.9.5

## 📅 Release Date: November 27, 2025

---

## 🌟 Highlights
This release achieves **100% completion** of all tester feedback items, delivering a significantly more stable, flexible, and feature-rich experience.

---

## 🆕 New Features

### 1. Real-Time Controls ⚡
- **BPM Control:** Adjust exercise speed from 50% to 150% in real-time.
- **Vocal Range Shift:** Transpose exercises up or down by semitones or full octaves instantly.

### 2. New Content 🎵
- **Descending Exercises:** Added "Descending Scale" and "Descending Arpeggio" for better vocal cooldowns and control practice.
- **Studies Section:** Added placeholder for future "Estudos" content (visible in Full Mode).

### 3. Enhanced Feedback 📊
- **Octave Count:** Results now show exact range in semitones AND octaves (e.g., "24 semitones (2.0 octaves)").
- **Better References:** AI now suggests 3-4 gender-balanced reference singers.

---

## 🛠️ Critical Fixes & Improvements

### 1. Audio & Stability 🔊
- **Fixed:** Audio now stops immediately when exiting an exercise.
- **Fixed:** "AudioContext was not allowed to start" errors resolved.
- **Fixed:** Microphone input issues resolved by fixing AudioContext lifecycle.
- **Fixed:** Pitch detection now filters out low-frequency noise (<100Hz).
- **Improved:** Latency compensation added for better audio/visual sync.

### 2. Navigation & UI 🧭
- **Fixed:** Exercises now load instantly (fixed navigation state lock).
- **Fixed:** Default vocal range uses correct values, preventing errors.
- **Fixed:** Responsive layout improved for all screen sizes.
- **Fixed:** Disabled buttons now show correctly with reduced opacity.

### 3. User Experience ✨
- **Slower Tempo:** Default exercise speed reduced by 60-70% for better learning.
- **Routines:** Verified working correctly with new game view.
- **AI Saving:** Verified AI exercises can be saved and reused.

---

## 📦 Build Information
- **Status:** Production Ready ✅
- **Build Time:** ~600ms
- **Bundle Size:** 1.5mb
- **Destination:** `dist/` folder (Ready for Netlify)

---

## 🎯 Next Steps
- Upload the `dist` folder to Netlify.
- Share the link with testers!
