import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registrar o Service Worker para suporte PWA (offline e instalação)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registra sw.js relativo à pasta base
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('ServiceWorker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.error('Falha ao registrar o ServiceWorker:', error);
      });
  });
}
