# Truth Shield

Truth Shield is a lightweight browser app for analyzing uploaded photos or videos and estimating whether the content is AI-generated or real.

## Features

- Upload image or video files.
- Local media preview.
- Heuristic analysis in the browser.
- Probability scores on a **0-10 scale**:
  - AI-generated probability score.
  - Real-media probability score.
- Signal breakdown (noise, saturation, temporal consistency).

## Run locally

Because this app uses browser APIs for file handling and canvas analysis, serve it with any static server:

```bash
python3 -m http.server 4173
```

Then open: <http://localhost:4173>

## Notes

This version uses heuristic scoring and is intended as a prototype. It is not a forensic-grade detector.
