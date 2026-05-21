
import { RecordButton } from './components/RecordButton';
import { TrackList } from './components/TrackList';
import { PlaybackControls } from './components/PlaybackControls';
import { AIArrangeButton } from './components/AIArrangeButton';

function App() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-black mb-4 tracking-tight">
          <span className="text-gradient">Bathroom</span> Composer
        </h1>
        <p className="text-slate-400 text-lg">Turn your voice into a full arrangement instantly.</p>
      </header>

      {/* Main Content */}
      <main className="space-y-12">
        {/* Record Section */}
        <section className="flex flex-col items-center justify-center p-12 glass-panel">
          <RecordButton />
        </section>

        {/* Playback Controls */}
        <section className="flex justify-center">
          <PlaybackControls />
        </section>

        {/* Tracks Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Tracks</h2>
            <AIArrangeButton />
          </div>
          <TrackList />
        </section>
      </main>
    </div>
  );
}

export default App;
