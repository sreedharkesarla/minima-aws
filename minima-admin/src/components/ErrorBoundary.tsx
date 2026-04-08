import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: '#f5f5f5',
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 600 }}>
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              The application encountered an error. Please try refreshing the page.
            </Typography>
            {this.state.error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Error:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>
                      Stack Trace:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        mt: 1,
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </>
                )}
              </Box>
            )}
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 3 }}
            >
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
