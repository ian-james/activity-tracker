import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { MockDataProvider } from './contexts/MockDataContext'
import { TemplatesProvider } from './contexts/TemplatesContext'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MockDataProvider>
        <TemplatesProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TemplatesProvider>
      </MockDataProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
