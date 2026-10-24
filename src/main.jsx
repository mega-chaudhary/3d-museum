import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadContent } from './systems/content'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/600.css'
import './styles.css'

// Load the owner's saved photos and words (if any) before showing the museum.
loadContent().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
