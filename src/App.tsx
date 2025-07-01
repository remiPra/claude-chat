import { MinimalResponsive } from './components/Chat/MinimalInterface';
import { TTSProvider } from './contexts/TTSContext'; // 🟢 NOUVEAU
import './index.css';

function App() {
  return (
    <TTSProvider>
      <MinimalResponsive />
    </TTSProvider>
  );
}

export default App;