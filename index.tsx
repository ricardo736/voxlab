
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './hooks/useTranslation';

import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider } from './context/AudioContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AudioProvider>
          <App />
        </AudioProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);