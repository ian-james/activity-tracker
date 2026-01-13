import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { MockDataProvider } from './contexts/MockDataContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MockDataProvider>
        <App />
      </MockDataProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
