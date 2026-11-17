# CliniFlow – hackathon steps

**CliniFlow**: a 3D indoor navigation app for a whole hospital campus, with voice search in
English, ಕನ್ನಡ, हिन्दी, മലയാളം and ತುಳು.

| Block | Floors | What's inside |
|---|---|---|
| **Main & Emergency Block** | Basement, Ground to 5th | Emergency & Trauma, CT/MRI, ICU, OT, Cath Lab, Maternity, NICU, Dialysis, Oncology, Wards, Blood Bank, Mortuary |
| **Outpatient (OPD) Block** | Ground to 3rd | Registration, Pharmacy, Lab, X-Ray, Ultrasound, and all OPD clinics (Medicine, Ortho, Paediatrics, ENT, Eye, Dental, Cardiology, Neuro…) |
| **Administrative Block** | Ground to 2nd | Billing, Insurance, Admission, Records, Complaints, Canteen, ATM, Administration, HR, Accounts, Nursing Office, Conference Hall, IT, Library |
| **Outdoors** | Ground | Main Gate, covered walkways, Visitor Parking, Ambulance Bay |

## Folders (your laptop)

```
D:\Projects\
├── HospiNavi\              ← other project, not touched
├── CliniFlow\              ← today's repo (git clone https://github.com/Srijan0018/CliniFlow.git)
└── cliniflow-hackathon\    ← unzipped files from Claude
```

## Push in steps

Open `D:\Projects\CliniFlow`, type `cmd` in the address bar and press Enter. Run each block, leaving
some time between them, so the history shows the work happening today.

**1. 3D engine + route finding**
```
git pull
mkdir docs\js
xcopy /E /I ..\cliniflow-hackathon\docs\vendor docs\vendor
copy ..\cliniflow-hackathon\docs\index.html docs\
copy ..\cliniflow-hackathon\docs\js\app.js docs\js\
copy ..\cliniflow-hackathon\docs\js\graph.js docs\js\
git add docs
git commit -m "3D campus viewer and multi-block route finding"
git push
```

**2. Hospital campus map (3 blocks)**
```
mkdir docs\data
copy ..\cliniflow-hackathon\docs\data\hospital.js docs\data\
xcopy /E /I ..\cliniflow-hackathon\tools tools
git add docs tools
git commit -m "Hospital campus: Main & Emergency, OPD and Admin blocks with walkways"
git push
```

**3. Live step tracking**
```
copy ..\cliniflow-hackathon\docs\js\tracking.js docs\js\
git add docs
git commit -m "Live tracking with step counting and QR check-in"
git push
```

**4. Voice search in 5 languages**
```
copy ..\cliniflow-hackathon\docs\js\voice.js docs\js\
xcopy /E /I ..\cliniflow-hackathon\voice-server voice-server
git add docs voice-server
git commit -m "Voice search: English, Kannada, Hindi, Malayalam, Tulu"
git push
```

**5. Docs (+ optional second-building demo)**
```
copy ..\cliniflow-hackathon\docs\README.md docs\
copy ..\cliniflow-hackathon\PUSH_TODAY.md .
copy ..\cliniflow-hackathon\docs\college.html docs\
copy ..\cliniflow-hackathon\docs\data\block3.js docs\data\
git add .
git commit -m "Docs and second building demo"
git push
```
(Leave out the two college lines if you don't want the SJEC Block 3 demo in this repo.)

The site works fully after step 4. Errors before that are expected.

If `git push` says *rejected*, a teammate pushed first. Run `git pull`, then `git push` again.

## Put it online (Srijan does this, as repo owner)

Go to **Settings → Pages**. Set Source to **Deploy from a branch**, Branch to **main**, Folder to **/docs**, then **Save**.
After about a minute it's live at **https://srijan0018.github.io/CliniFlow/**. The QR codes use this address automatically.

**Test on the laptop without internet:** `cd docs` then `python -m http.server 8000`, and open http://localhost:8000.

## Before presenting
- [ ] Open the live link on the demo phone in **Chrome** and allow the microphone.
- [ ] Turn on mobile data or a hotspot. Voice uses Chrome's speech service; typing works offline.
- [ ] Print 3-4 door QR codes: click **QR codes**, pick a floor, then print.

## Demo script (about 2 minutes)
1. **Outside view.** "This is the whole hospital campus: Main & Emergency, OPD and Administrative blocks,
   joined by covered walkways." Tap a building to go inside.
2. **Kannada voice.** Tap **ಕನ್ನಡ**, then **Ask by voice**, and say *"ತುರ್ತು ಚಿಕಿತ್ಸೆ ಎಲ್ಲಿ"*.
   The route goes from the Main Gate to Emergency, and the answer names the block.
3. **Between blocks, in Hindi.** Tap **हिन्दी** and say *"कॉन्फ्रेंस हॉल कहाँ है"*.
   The route goes from the gate along the walkway into the Admin Block and up to floor 2. Tap **All** to see every floor.
4. **Patient journey.** Set the start to Billing (Admin Block) and the destination to Private Rooms (Main Block, floor 5).
   Point out the steps: *"…out of the Admin Block, along the covered walkway… into the Main Block… take the Bed Lift"*.
5. **Accessibility.** Tick **Avoid stairs**: wheelchair users are always sent by lift.
6. **Nearest facility.** From Cardiology (OPD floor 2), say *"where is the toilet"*. It picks the nearest
   one on the same floor of the same block.
7. **QR + tracking.** Scan a door QR code, tap **Start walking**, and the dot follows your steps.

## Quick fixes
| Problem | Fix |
|---|---|
| Voice button says not supported | Use Chrome or Edge. Or type: every language works in the box |
| Microphone blocked | Chrome → site settings → Microphone → Allow (the site must be https) |
| Tulu not recognised | No phone recogniser supports Tulu. Type it, or run `voice-server` and open `?api=<link>` once |
| Old version after a push | Wait 2 minutes, then press Ctrl+Shift+R |
| Move a department or rename a block | Edit `BLOCKS` in `tools/build_hospital_data.py`, run `python tools/build_hospital_data.py`, push |
