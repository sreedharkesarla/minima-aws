import React from 'react';
import ReactDOM from 'react-dom/client';

// Minimal test - just render "Hello World"
const TestApp = () => {
  return (
    <div style={{ 
      padding: '50px', 
      fontFamily: 'Arial', 
      fontSize: '24px',
      background: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#2196F3' }}>React is Working! ✓</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>The issue is likely in the App component or its dependencies.</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3>Next Steps:</h3>
        <ul>
          <li>Check browser console for errors</li>
          <li>Look for import/module errors</li>
          <li>Verify all dependencies are installed</li>
        </ul>
      </div>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}
