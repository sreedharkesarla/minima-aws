import { ChatMessage, ChatConfig } from './types';

const styles = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    font-family: var(--minima-chat-font, system-ui, -apple-system, sans-serif);
    --accent-color: var(--minima-chat-accent, #4f46e5);
  }

  .chat-shell {
    display: grid;
    grid-template-rows: 56px 1fr 80px;
    height: 100%;
    border: 1px solid #111827;
    border-radius: 12px;
    overflow: hidden;
    background: white;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: #111827;
    color: white;
  }

  .chat-title {
    font-size: 16px;
    font-weight: 500;
  }

  .status-badge {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 12px;
    background: rgba(255,255,255,0.2);
  }

  .status-badge.connected {
    background: #10b981;
  }

  .chat-log {
    overflow-y: auto;
    padding: 16px;
    background: #fafafa;
  }

  .message {
    margin-bottom: 16px;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message-role {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .message-bubble {
    display: inline-block;
    padding: 10px 14px;
    border-radius: 12px;
    max-width: 85%;
    word-wrap: break-word;
    border: 1px solid #e5e7eb;
    background: white;
  }

  .message.user .message-bubble {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .message.assistant .message-bubble {
    background: white;
    color: #111827;
  }

  .chat-footer {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #f3f4f6;
    align-items: center;
    border-top: 1px solid #e5e7eb;
  }

  .chat-input {
    flex: 1;
    resize: none;
    height: 48px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    font-family: inherit;
    font-size: 14px;
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .send-button {
    height: 48px;
    padding: 0 20px;
    border-radius: 10px;
    border: none;
    background: var(--accent-color);
    color: white;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .send-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

export class MinimaChatWidget extends HTMLElement {
  private shadow: ShadowRoot;
  private ws: WebSocket | null = null;
  private messages: ChatMessage[] = [];
  private config: ChatConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.config = {
      endpoint: this.dataset.endpoint || '',
      conversationId: this.dataset.conversationId || this.generateId(),
      authToken: this.dataset.authToken,
    };
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.disconnect();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private render() {
    const template = `
      <style>${styles}</style>
      <div class="chat-shell">
        <header class="chat-header">
          <div class="chat-title">Assistant</div>
          <div class="status-badge" id="status">Disconnected</div>
        </header>
        
        <div 
          class="chat-log" 
          id="log" 
          role="log" 
          aria-live="polite" 
          aria-relevant="additions text"
          aria-label="Conversation history"
        ></div>
        
        <footer class="chat-footer">
          <label class="sr-only" for="input">Type a message</label>
          <textarea 
            id="input" 
            class="chat-input" 
            placeholder="Ask a question..."
            rows="1"
          ></textarea>
          <button id="send" class="send-button" disabled>Send</button>
        </footer>
      </div>
      
      <div class="sr-only" id="status-text" role="status" aria-live="polite"></div>
    `;

    this.shadow.innerHTML = template;
  }

  private attachEventListeners() {
    const sendBtn = this.shadow.getElementById('send') as HTMLButtonElement;
    const input = this.shadow.getElementById('input') as HTMLTextAreaElement;

    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-connect if endpoint is provided
    if (this.config.endpoint) {
      setTimeout(() => this.connect(), 500);
    }
  }

  public connect() {
    if (!this.config.endpoint) {
      this.announceStatus('Error: No endpoint configured');
      return;
    }

    const wsUrl = this.config.endpoint
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
      this.announceStatus('Connected to assistant');
      this.config.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      const err = new Error('WebSocket connection error');
      this.config.onError?.(err);
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus(false);
      this.announceStatus('Disconnected');
      this.config.onDisconnect?.();
      this.attemptReconnect();
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.announceStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), 3000);
    }
  }

  private updateConnectionStatus(connected: boolean) {
    const statusBadge = this.shadow.getElementById('status');
    const sendBtn = this.shadow.getElementById('send') as HTMLButtonElement;
    
    if (statusBadge) {
      statusBadge.textContent = connected ? 'Connected' : 'Disconnected';
      statusBadge.classList.toggle('connected', connected);
    }
    
    if (sendBtn) {
      sendBtn.disabled = !connected;
    }
  }

  private sendMessage() {
    const input = this.shadow.getElementById('input') as HTMLTextAreaElement;
    const text = input.value.trim();

    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(message);
    this.renderMessage(message);
    input.value = '';

    this.ws.send(JSON.stringify({
      type: 'question',
      content: text,
    }));
  }

  private handleMessage(data: any) {
    if (data.type === 'answer') {
      const message: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };

      this.messages.push(message);
      this.renderMessage(message);
      this.config.onMessage?.(message);
    }
  }

  private renderMessage(message: ChatMessage) {
    const log = this.shadow.getElementById('log');
    if (!log) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${message.type}`;
    msgDiv.innerHTML = `
      <div class="message-role">${message.type}</div>
      <div class="message-bubble">${this.escapeHtml(message.content)}</div>
    `;

    log.appendChild(msgDiv);
    log.scrollTop = log.scrollHeight;
  }

  private announceStatus(text: string) {
    const statusEl = this.shadow.getElementById('status-text');
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
if (!customElements.get('minima-chat')) {
  customElements.define('minima-chat', MinimaChatWidget);
}
