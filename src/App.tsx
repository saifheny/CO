import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { CanvasEditor } from './components/canvas/CanvasEditor';
import { AIContextMenu } from './components/AIContextMenu';
import { HomeScreen } from './components/HomeScreen';
import { initDB } from './db/db';
import { useStore } from './store/useStore';

function App() {
  const [isReady, setIsReady] = useState(false);
  const { view, isPresenting } = useStore();

  useEffect(() => {
    initDB().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fbfaf9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 border-4 border-[#e5484d] border-t-transparent rounded-[14px] animate-spin" />
          <span className="text-gray-400 text-sm font-medium">يتم تجهيز دفترك...</span>
        </div>
      </div>
    );
  }

  if (view === 'home') return <HomeScreen />;

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden relative">
      <CanvasEditor />
      {!isPresenting && <><AIContextMenu /><Toolbar /></>}
    </div>
  );
}

export default App;
