# Scale Finder

A music theory tool for guitarists and bassists. Pick notes, find matching scales, explore fretboard diagrams.

![Scale Finder](https://raw.githubusercontent.com/phatduckk/scale-finder/main/screenshot.png)

![Fretboard Modal](https://raw.githubusercontent.com/phatduckk/scale-finder/main/screenshot-modal.png)

## Features

- **Note input** — click the 12 chromatic note buttons to build your note set
- **Scale detection** — instantly shows all matching scales grouped by type (modes, pentatonic, blues, exotic), ranked by how well your notes fit
- **Suggested keys** — top matches shown as chips; click any to open the fretboard
- **Sharp/flat toggle** — flip between D#/Eb, G#/Ab, etc. across the entire UI
- **Fretboard modal** — click any scale card to see it on a guitar or bass fretboard with triads color-coded (root/third/fifth)
- **Fret highlighting** — click or drag across fret numbers to spotlight a position; click individual dots to dim notes you're not using
- **File import** — drop in a PDF, text, or tab file and the notes auto-populate from chord names or tab notation
- **Song library** — save and reload note sets by name; duplicate names prompt to overwrite or rename

---

## Just want to use it? (No setup required)

You don't need to install anything. The app works by just opening a single file in your browser.

**1. Download the project**

Click the green **Code** button at the top of this page → **Download ZIP**, then unzip it somewhere on your computer.

**2. Open the app**

Open the unzipped folder and double-click **`index.html`**. That's it.

Your saved songs and preferences are stored in your browser's local storage, so they stick around between sessions. No server, no database, no terminal.

---

## Server mode (for developers)

Running the server gives you a proper MySQL-backed song library and settings that persist across browsers and devices.

### Requirements

- Node.js 18+
- MySQL 8+

### Install

```bash
git clone git@github.com:phatduckk/scale-finder.git
cd scale-finder
./install.sh
```

The installer will:
1. Run `npm install`
2. Ask for your MySQL admin credentials (blank = tries root with no password)
3. Create the `scales` database, `scales` DB user, and all tables — **never drops existing data**

### Run

```bash
./server.sh          # starts on port 3001 and opens your browser
./server.sh 8080     # use a custom port
```

Or just `npm start` if you don't need the browser to auto-open.

### Database

Two tables are created automatically:

| Table | Purpose |
|---|---|
| `songs` | Saved note sets with name and timestamp |
| `settings` | Persisted preferences (guitar/bass, sharp/flat) |

Both use `utf8mb4` / `utf8mb4_unicode_ci` — case-insensitive, emoji-safe. Song names are unique at the DB level.

---

## How scale matching works

For every combination of root note × scale type, the app checks whether your selected notes are a subset of that scale. Matches are ranked by **coverage** — how much of the scale your notes fill (e.g. 5 of 7 notes = 71%). Scales with fewer total notes rank higher at equal coverage, so pentatonics surface before 7-note modes when you've only picked a few notes.

## Triads

The fretboard and scale cards color-code the triad:

- 🔵 **Blue** — root
- 🟠 **Orange** — third
- 🟣 **Purple** — fifth
