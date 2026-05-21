# Bathroom Composer (Hum Composer)

A React, TypeScript, and Vite-based web application that transcribes hummed vocal melodies into MIDI sequences, and automatically synthesizes a full multi-track arrangement using the Google Gemini API.

## Core Features

- **Audio Transcription**: Captures live microphone input and translates audio frequencies into discrete MIDI notes utilizing `@spotify/basic-pitch`.
- **AI Arrangement Engine**: Leverages `gemini-3.5-flash` to analyze the hummed melody (inferring key, tempo, and mood) and dynamically compose accompanying bass, chord, and drum tracks.
- **Multitrack Playback**: Simulates synthesized playback of generated tracks in-browser using `tone` and `soundfont-player`.
- **Composition Export**: Supports exporting compositions directly to MIDI files (`.mid`) via `midi-writer-js` or rendering to audio streams (`.webm`).

## Tech Stack

- **Framework**: React 19, Vite, TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Audio Processing**:
  - Spotify Basic Pitch (Vocal-to-MIDI Transcription)
  - Tone.js & Soundfont Player (In-browser synthesis and playback)
  - Midi-writer-js (MIDI serialization)
- **AI API Integration**: `@google/genai` (Google GenAI SDK)

## Project Structure

```
├── .env.example            # Environment variable template
├── index.html              # HTML Entry Point
├── package.json            # Dependencies and script definitions
├── src/
│   ├── main.tsx            # Application entry point
│   ├── App.tsx             # Root React component and layout
│   ├── App.css             # Styling rules
│   ├── global.d.ts         # TypeScript module overrides
│   ├── index.css           # Global stylesheet and Tailwind directives
│   ├── ai/
│   │   └── composer.ts     # Gemini API integration and response schema
│   ├── audio/
│   │   ├── recorder.ts     # Web Audio API microphone capture handler
│   │   ├── synth.ts        # Soundfont synthesis engine and player
│   │   └── transcriber.ts  # Basic Pitch model wrapper for pitch detection
│   ├── components/
│   │   ├── AIArrangeButton.tsx   # Controls to request arrangement generation
│   │   ├── LiveVisualizer.tsx    # Live canvas microphone visualizer
│   │   ├── PlaybackControls.tsx  # Play, stop, MIDI/Audio export actions
│   │   ├── RecordButton.tsx      # Main audio input controller
│   │   └── TrackList.tsx         # Multitrack display, volume, solo, and mute controls
│   └── store/
│       └── useStore.ts     # Zustand store defining state and actions
```

## Setup and Installation

### Prerequisites

- Node.js (version 18 or higher recommended)
- A Gemini API Key from Google AI Studio

### Installation Steps

1. **Clone and Navigate to the Repository**:
   ```bash
   cd bathroom-composer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and set your API key:
   ```env
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your web browser.

## Architecture & Integration Flow

1. **Recording Phase**:
   - The `AudioRecorder` initiates a microphone stream via the Web Audio API and records the hummed melody into a temporary buffer.
   - `LiveVisualizer` uses a Web Audio `AnalyserNode` to render visual waveforms of the incoming signal in real time.

2. **Transcription Phase**:
   - The `transcribeAudio` utility feeds the raw AudioBuffer into Spotify's `BasicPitch` model.
   - The model predicts onset/contour frames and outputs raw note sequences (`NoteEventTime[]`).
   - The notes are converted to standard MIDI pitches and populated into the Zustand store as the primary lead track.

3. **Composition/Arrangement Phase**:
   - The user inputs a preferred genre/style (e.g., Lo-Fi, Jazz) and triggers `Auto-Arrange with AI`.
   - The lead melody note sequence and genre parameter are sent to Google's GenAI SDK using `gemini-3.5-flash`.
   - The LLM processes the sequence under strict JSON schema instructions to return three complementary tracks:
     1. A Bassline
     2. A Chord progression
     3. A Drum beat
   - The structured JSON response is parsed and appended to the Zustand tracks collection.

4. **Synthesis & Playback**:
   - `synthEngine` pre-loads the necessary Soundfont instruments (`acoustic_grand_piano`, `acoustic_guitar_steel`, `synth_drum`, etc.).
   - When playback is triggered, Tone.js schedules audio events based on the absolute note start times.

5. **Exporting Compositions**:
   - **MIDI**: Serializes tracks and notes into a standard MIDI format using `midi-writer-js` and triggers a browser download.
   - **Audio**: Captures the synthesized master output stream using Web Audio `MediaRecorder` and saves the result as a `.webm` audio file.
