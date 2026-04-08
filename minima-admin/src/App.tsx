// Removed unused React import
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppProvider } from './contexts/AppContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { FileIntakePage } from './pages/FileIntakePage';
import { ProcessingQueuePage } from './pages/ProcessingQueuePage';
import { JobDetailPage } from './pages/JobDetailPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersRolesPage } from './pages/UsersRolesPage';
import { ChatPage } from './pages/ChatPage';
import { NotificationSnackbar } from './components/NotificationSnackbar';

const theme = createTheme({
  palette: {
    primary: {
      main: '#111827',
    },
    secondary: {
      main: '#4f46e5',
    },
    background: {
      default: '#ffffff',
      paper: '#fafafa',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
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
              <Route index element={<Navigate to="/intake" replace />} />
              <Route path="intake" element={<FileIntakePage />} />
              <Route path="queue" element={<ProcessingQueuePage />} />
              <Route path="jobs/:jobId" element={<JobDetailPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="audit" element={<AuditLogsPage />} />
              <Route path="users" element={<UsersRolesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/intake" replace />} />
          </Routes>
          <NotificationSnackbar />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
