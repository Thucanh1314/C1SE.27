import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import AppRoutes from './routes/index.jsx';
import GlobalStyles from './components/GlobalStyles/index.jsx';
import './styles/main.scss';

import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { WorkspaceProvider } from './contexts/WorkspaceContext.jsx';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <GlobalStyles>
                <Router>
                  <AppRoutes />
                </Router>
              </GlobalStyles>
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

