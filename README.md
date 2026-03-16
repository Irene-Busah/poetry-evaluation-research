# Poetry Evaluation Study

A web-based academic study designed to evaluate and compare AI-generated poetry on shared themes (Longing, Grief, Hope). Built with vanilla HTML/JS/CSS and powered by Firebase Realtime Database for data collection.

## Overview

This study explores reader responses to different prompt augmentations in AI poetry generation. Participants are assigned a random subset of 9 pairwise comparisons from a pool of 45, balanced evenly across themes.

For each pair, participants are asked five specific questions:
1. **Stronger Overall** (Poem A / Poem B / Tie)
2. **Emotional Impact** (Poem A / Poem B / Both equally / Not sure)
3. **Originality of Language** (Poem A / Poem B / Both equally / Not sure)
4. **Like / Endorse** (Poem A / Poem B / Both equally / Neither)
5. **Human Authorship Perception** (Poem A / Poem B / Both / Neither / Not sure)

The display order (left/right) is randomized per participant to prevent position bias, but the data is normalized back to the canonical `poemA` and `poemB` in the final dataset.

## Project Structure

- `index.html`: The participant-facing study interface.
- `script.js`: Core study logic (state management, rendering, and Firebase writes).
- `style.css`: Unified styling for both the study and the admin dashboard.
- `poems.js`: The dataset of 45 real poems (derived from CSVs) and the 45 pairwise comparisons logic. Includes the random assignment algorithm.
- `admin.html`: The secure admin dashboard.
- `admin.js`: Admin logic handling Google Sign-In, real-time data fetching, stats rendering, and 30-column CSV export.
- `firebase-config.js`: Firebase API credentials and Admin Email configuration.

## Setup & Deployment

1. **Firebase**:
   - The project uses **Firebase Realtime Database** to store responses.
   - **Firebase Authentication** (Google Sign-In) is used to protect the admin dashboard.
   - Credentials are in `firebase-config.js`.

2. **Security Rules**:
   - Participants can write data (append-only) but cannot read it.
   - Only the designated `ADMIN_EMAIL` can read data.
   ```json
   {
     "rules": {
       "sessions": {
         ".read":  "auth.token.email === 'admin@example.com'",
         "$sessionId": {
           ".write": "!data.exists()"
         }
       }
     }
   }
   ```

3. **Deployment**:
   - The project is deployed on **GitHub Pages**.
   - Because it uses Firebase Auth, the GitHub Pages domain (e.g., `username.github.io`) must be added to the **Authorized domains** list in the Firebase Authentication settings.

## Local Development

To run the project locally (required because of ES modules/CORS with Firebase):

```bash
# Start a local Python HTTP server
python3 -m http.server 8000
```

Then visit:
- Study: `http://localhost:8000`
- Dashboard: `http://localhost:8000/admin.html`

## Data Structure

Data is stored in Firebase under the `sessions/` node. Each session corresponds to one participant's complete submission.

```json
/sessions/
  sess_abc123_1718000000000/
    sessionId:   "sess_abc123_1718000000000"
    completedAt: "2026-03-16T12:00:00.000Z"
    familiarity: "somewhat_familiar"
    responses: [
      {
        "comparisonId": "comp-01",
        "comparison_type": "Baseline_vs_Guideline",
        "theme": "Longing",
        "poemA_id": "Longing-Baseline-1",
        "poemB_id": "Longing-Guideline-1",
        "original_condition_A": "Baseline",
        "original_condition_B": "Guideline",
        "displayed_left_poem_id": "Longing-Guideline-1",
        "displayed_right_poem_id": "Longing-Baseline-1",
        "displayed_left_condition": "Guideline",
        "displayed_right_condition": "Baseline",

        "stronger_overall_answer": "Tie",
        "stronger_overall_selected_poem_id": "",
        "stronger_overall_selected_condition": "",

        "emotional_impact_answer": "Poem A",
        "emotional_impact_selected_poem_id": "Longing-Guideline-1",
        "emotional_impact_selected_condition": "Guideline",

        "originality_answer": "Both equally",
        "originality_selected_poem_id": "BOTH",
        "originality_selected_condition": "BOTH",

        "like_answer": "Poem B",
        "like_selected_poem_id": "Longing-Baseline-1",
        "like_selected_condition": "Baseline",

        "human_authorship_answer": "Not sure",
        "human_authorship_selected_poem_id": "NOT_SURE",
        "human_authorship_selected_condition": "NOT_SURE",

        "timestamp": "2026-03-16T11:55:00.000Z"
      },
      ...
    ]
```

### CSV Export

The Admin Dashboard includes a "Export CSV" feature that flattens this nested JSON into a clean, **30-column** CSV file ready for statistical analysis in SPSS, R, or Python.
