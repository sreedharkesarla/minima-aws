import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FileIntakePage } from './pages/FileIntakePage';
import { ProcessingQueuePage } from './pages/ProcessingQueuePage';
import { JobDetailPage } from './pages/JobDetailPage';
import { UsersRolesPage } from './pages/UsersRolesPageEnhanced';
import { ChatPage } from './pages/ChatPage';
import { UsagePage } from './pages/UsagePage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { NotificationSnackbar } from './components/NotificationSnackbar';

function AppContent() {
  const { currentTheme } = useTheme();

  return (
    <MuiThemeProvider theme={currentTheme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route - Login */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes - wrapped in AppShell */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="intake" element={<FileIntakePage />} />
              <Route path="queue" element={<ProcessingQueuePage />} />
              <Route path="jobs/:jobId" element={<JobDetailPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="users" element={<UsersRolesPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/intake" replace />} />
          </Routes>
          <NotificationSnackbar />
        </BrowserRouter>
      </AppProvider>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
