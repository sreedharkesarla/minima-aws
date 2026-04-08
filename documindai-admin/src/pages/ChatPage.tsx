import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  Alert,
} from '@mui/material';
import { Send, Person, SmartToy, Info } from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const ChatPage: React.FC = () => {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! I can help you search through your indexed documents. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const conversationId = useRef<string>(Date.now().toString());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!state.user) return;

    // Connect to WebSocket
    // URL structure: /chat/{collection_name}/{conversation_id}/{file_ids}
    // Using 'TM' as collection name since that's where documents are indexed
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/chat/TM/${state.user.username}-${conversationId.current}/`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      
      // Parse JSON response from chat backend
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'answer' && data.message) {
          setIsTyping(false);
          const botMessage: Message = {
            id: Date.now().toString(),
            sender: 'bot',
            text: data.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
        } else if (data.type === 'question' && data.message) {
          // Echo of our question - ignore it since we already added it
          console.log('Question echo:', data.message);
        } else if (data.type === 'start_message' || data.type === 'disconnect_message') {
          setIsTyping(false);
          console.log('System message:', data.type);
        }
      } catch (error) {
        // If not JSON, display raw text
        setIsTyping(false);
        const botMessage: Message = {
          id: Date.now().toString(),
          sender: 'bot',
          text: event.data,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [state.user]);

  const handleSend = async () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Send message via WebSocket
    wsRef.current.send(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Ask Chat
        </Typography>
        <Chip
          icon={<Info />}
          label="Beta"
          color="primary"
          variant="outlined"
        />
      </Box>

      <Alert severity={isConnected ? "success" : "warning"} sx={{ mb: 3 }}>
        {isConnected ? (
          <>
            <strong>Connected:</strong> Chat is ready. Ask questions about your indexed documents.
          </>
        ) : (
          <>
            <strong>Connecting:</strong> Establishing connection to chat service...
          </>
        )}
      </Alert>

      <Paper elevation={3} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: '#fafafa',
          }}
        >
          <List>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                  gap: 1,
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                    width: 36,
                    height: 36,
                  }}
                >
                  {message.sender === 'user' ? (
                    <Person fontSize="small" />
                  ) : (
                    <SmartToy fontSize="small" />
                  )}
                </Avatar>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user' ? 'primary.light' : 'white',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
            {isTyping && (
              <ListItem sx={{ gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                  <SmartToy fontSize="small" />
                </Avatar>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                  <Typography variant="body2" color="text.secondary">
                    Typing...
                  </Typography>
                </Paper>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Box>

        {/* Input area */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'white',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask a question about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!state.user || !isConnected}
              variant="outlined"
              size="small"
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || !state.user || !isConnected}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { bgcolor: 'action.disabledBackground' },
              }}
            >
              <Send />
            </IconButton>
          </Box>
          {!state.user && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Please log in to use the chat feature
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
