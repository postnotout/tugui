import { useState } from 'react';
import ChartQuizGame from './components/ChartQuizGame';
import OffenseNote from './components/OffenseNote';

type AppView = 'game' | 'wrongnote';

export default function App() {
  const [view, setView] = useState<AppView>('game');

  if (view === 'wrongnote') {
    return <OffenseNote onClose={() => setView('game')} />;
  }

  return <ChartQuizGame onOpenWrongNote={() => setView('wrongnote')} />;
}
