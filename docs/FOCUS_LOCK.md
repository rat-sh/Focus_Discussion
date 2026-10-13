# Focus Lock: spec

Goal: measure quality of study time, not clock time. Sleeping or leaving the desk must not complete a timer.

## Flow
1. **Materials** (min 1): study material (PDF / YouTube / any link), practice (link or offline), AI helper (ChatGPT, Gemini, Claude or any link).
2. **Timer**: topic, minutes, rest budget (default 10%).
3. **Face check**: camera on, face found, show or hide face tile, share colour with room (optional).
Then the session screen: links as tabs, countdown, quality counter, corner camera tile, state banner, rest button, music, end.

## Colours (always with icon + text, never colour alone)
| State | Colour | Meaning | Counts as quality |
|---|---|---|---|
| Focused | green | attentive face | yes |
| Phone | yellow | possible phone use when a phone is visible and the head stays tilted. Warning, clock keeps running, time not counted | no |
| Resting | pink | declared by the student with the Rest button (5 min per tap) | no, free within the rest budget |
| Away / not attentive | red | no face, eyes closed for long, looking away | no |
| Not confirmed | grey | face not yet confirmed, page hidden, camera blocked or paused | no |

`resting` is never inferred by the detector. A short eye rest must not be mistaken for sleep, and the student should not be punished for needing a break.

## Score
`score = focused / (elapsed - rest within budget)`. Rest beyond the budget counts against the score. Same function in `src/domain/focus.ts` and (later) a SQL view.

## Privacy
- Detection runs on the device. No video or frames leave it. Only run-length colour segments are saved.
- "Blank, still tracked": the tile shows an avatar, the video keeps feeding the detector off-screen.
- Others see a colour dot only if the student opts in. Segments are owner-only (RLS).
- Needs an explicit consent screen and a "delete my focus history" action before launch (not built).

## Browser limits (design consequences)
- A web page cannot see or lock other tabs. Focus Lock is a plan plus attention measurement, not a hard lock.
- Many AI and practice sites refuse to be embedded in an iframe (inference, verify per site). YouTube and PDFs embed; everything else opens in a new tab. Time on another tab shows as Not tracked.
- Desktop: the Document Picture-in-Picture API gives a small always-on-top window so the camera tile and timer stay visible over other tabs. It is desktop Chromium-class only, not on mobile (verify current Firefox/Safari status). The button appears only when supported. Untested in this build.
- Phone: browsers commonly pause the camera when the page is in the background (inference, test on real devices). Keep the screen awake with the Screen Wake Lock API (where supported). Prefer in-app PDF/YouTube on phones.

## Detector
The UI only knows `AttentionEngine` (`features/focus/engine/types.ts`). Mock mode retains `MockAttentionEngine`; real mode uses `MediaPipeAttentionEngine`.
- Face Landmarker runs on the camera stream in the browser and reads face presence, eye-blink blendshapes, and head pose.
- EfficientDet-Lite0 also runs in the browser and looks for the COCO `cell phone` class. A phone is only marked as possible phone use when it is detected together with a sustained downward head pose.
- The engine samples once per second and passes signals to `classify.ts`. A brief missing-face interval is grey; continued absence changes to red after 5 seconds. Eye closure changes to red after 10 continuous minutes, and looking sideways after 30 seconds; a blink or quick glance should not change the state.
- Model files are served from `public/models/` (Google's [Face Landmarker task](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task) and [EfficientDet-Lite0 detector](https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite)). The MediaPipe WASM runtime is loaded from the version-pinned `@mediapipe/tasks-vision` jsDelivr path. A network/model/runtime error is shown and that session is saved as untracked.
- Detection is local: camera frames and landmarks are never sent to the API or stored. Focus segments and their colors are saved through the existing owner-only focus records.
- The uploaded CrowdCount project is a server-side YOLO11 person counter, not a face/eye detector; it remains unsuitable for per-student webcam processing.

The initial thresholds in `classify.ts` are product starting points, not clinically or scientifically validated measurements. Calibrate on real phones and laptops with reading, writing, looking down at a book, blinks, glasses, low light, phone use, and naps before treating the estimates as reliable. Focused means the student appears present during their planned study session; this cannot verify comprehension or identify whether a detected phone is being used for study or entertainment.

## Still not built
Consent and delete-history screens, room-level focus sharing over realtime, offline resume of a session after a reload (a reload restarts the timer).
