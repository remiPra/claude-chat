import { MinimalResponsive } from './components/Chat/MinimalInterface';
import { TTSProvider } from './contexts/TTSContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <TTSProvider>
        <MinimalResponsive />
      </TTSProvider>
    </GoogleOAuthProvider>
  );
}

export default App;