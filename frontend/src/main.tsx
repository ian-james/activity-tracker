import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { MockDataProvider } from './contexts/MockDataContext'
import { TemplatesProvider } from './contexts/TemplatesContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MockDataProvider>
        <TemplatesProvider>
          <App />
        </TemplatesProvider>
      </MockDataProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
