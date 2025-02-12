import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './lib/query-client'
import './index.css'

// Configure allowed origins for postMessage
const ALLOWED_ORIGINS = [
  'https://gptengineer.app',
  'http://localhost:3000',
  'https://lovable.dev',
  'https://www.siso.agency',
  'https://siso.agency'
];

// Set allowed origins on window object
window.ALLOWED_ORIGINS = ALLOWED_ORIGINS;

// Lazy load ReactQueryDevtools
const ReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => ({
    default: ReactQueryDevtools
  }))
);

// Create root and render app with correct provider order
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
)