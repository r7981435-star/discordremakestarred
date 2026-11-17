let isLoginMode = true;
let currentUser = null;

const DEFAULT_MESSAGES = {
  welcome: [
    {
      id: 1,
      author: "Not Donut Bot",
      avatarColor: "#ff3366",
      avatarText: "B",
      isBot: true,
      time: "Today at 12:00 PM",
      text: "Welcome to the Not Donut SMP Discord! Type in the chat box below to send a message. Try typing **!help** for bot commands."
    }
  ],
  general: [
    {
      id: 2,
      author: "Not Donut Bot",
      avatarColor: "#ff3366",
      avatarText: "B",
      isBot: true,
      time: "Today at 12:01 PM",
      text: "This is the **#general** discussion channel. Share your base builds, trades, and adventures here!"
    }
  ],
  announcements: [
    {
      id: 3,
      author: "Not Donut Bot",
      avatarColor: "#ff3366",
      avatarText: "B",
      isBot: true,
      time: "Today at 12:02 PM",
      text: "🚨 **Server Announcement**: Season 2 is live! Join with IP **notdonutsmp.sadhost.com** or click the **N** server icon on the left to view our landing page."
    }
  ]
};

let messages = JSON.parse(localStorage.getItem('discord-clone-messages')) || DEFAULT_MESSAGES;
let currentChannel = 'welcome';

// UI Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authError = document.getElementById('auth-error');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const channelLinks = document.querySelectorAll('.channel');
const currentChannelText = document.getElementById('current-channel');

// Static mock users stored in localStorage for GitHub Pages mode
function getMockUsers() {
  const stored = localStorage.getItem('discord-mock-users');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) {}
  }
  return {
    'admin': 'admin123',
    'demo': 'demo123'
  };
}

function saveMockUsers(users) {
  localStorage.setItem('discord-mock-users', JSON.stringify(users));
}

// --- AUTH LOGIC (Hybrid: Backend API with static GitHub Pages fallback) ---

async function checkAuth() {
  // 1. Try server backend if running
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      localStorage.setItem('discord-current-user', currentUser);
      showApp();
      return;
    }
  } catch (e) {
    // Offline or static host (GitHub Pages)
  }

  // 2. Fallback to localStorage session
  const savedUser = localStorage.getItem('discord-current-user');
  if (savedUser) {
    currentUser = savedUser;
    showApp();
  } else {
    showAuth();
  }
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  
  // Update profile UI
  document.getElementById('user-display-name').textContent = currentUser;
  document.getElementById('user-avatar').textContent = (currentUser[0] || 'U').toUpperCase();
  
  renderMessages();
}

function showAuth() {
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isLoginMode = !isLoginMode;
  document.querySelector('.auth-box h1').textContent = isLoginMode ? "Welcome back!" : "Create an account";
  document.getElementById('auth-submit').textContent = isLoginMode ? "Log In" : "Register";
  document.getElementById('auth-switch-text').textContent = isLoginMode ? "Need an account?" : "Already have an account?";
  document.querySelector('.auth-switch a').textContent = isLoginMode ? "Register" : "Log In";
  authError.textContent = "";
}

async function handleAuth() {
  const username = document.getElementById('auth-user-key').value.trim();
  const password = document.getElementById('auth-pass-code').value;
  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  
  if (!username || !password) {
    authError.textContent = "Please fill in all fields.";
    return;
  }

  // 1. Try backend API first
  let backendResponded = false;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    backendResponded = true;
    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      localStorage.setItem('discord-current-user', currentUser);
      showApp();
      return;
    } else {
      const data = await res.json().catch(() => null);
      if (data && data.error) {
        authError.textContent = data.error;
        return;
      }
    }
  } catch (err) {
    // Backend unreachable -> Proceed to static client-side fallback
  }

  // 2. Client-side static fallback (GitHub Pages mode)
  if (!backendResponded) {
    const mockUsers = getMockUsers();
    const lowerUser = username.toLowerCase();

    if (isLoginMode) {
      if (mockUsers[lowerUser]) {
        if (mockUsers[lowerUser] === password) {
          currentUser = username;
          localStorage.setItem('discord-current-user', currentUser);
          showApp();
        } else {
          authError.textContent = "Invalid password.";
        }
      } else {
        // Auto-register convenience on static demo or prompt
        mockUsers[lowerUser] = password;
        saveMockUsers(mockUsers);
        currentUser = username;
        localStorage.setItem('discord-current-user', currentUser);
        showApp();
      }
    } else {
      // Register mode
      if (mockUsers[lowerUser]) {
        authError.textContent = "Username already taken.";
      } else {
        mockUsers[lowerUser] = password;
        saveMockUsers(mockUsers);
        currentUser = username;
        localStorage.setItem('discord-current-user', currentUser);
        showApp();
      }
    }
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (e) {
    // Static host fallback
  }
  currentUser = null;
  localStorage.removeItem('discord-current-user');
  showAuth();
}

// --- CHAT LOGIC ---

function renderMessages() {
  chatContainer.innerHTML = '';
  const channelMessages = messages[currentChannel] || [];
  
  if (channelMessages.length === 0) {
    chatContainer.innerHTML = `<div style="text-align: center; color: #949ba4; margin-top: 50px;">Welcome to #${currentChannel}! No messages yet.</div>`;
    return;
  }

  channelMessages.forEach(msg => {
    let formattedText = (msg.text || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#00a8fc;text-decoration:underline;">$1</a>')
      .replace(/\n/g, '<br>');

    const html = `
      <div class="message">
        <div class="avatar" style="background-color: ${msg.avatarColor || '#5865F2'};">${msg.avatarText || 'U'}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="username" ${msg.isBot ? 'style="color: var(--accent);"' : ''}>${msg.author}</span>
            ${msg.isBot ? '<span style="background: var(--accent); color: #fff; font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 3px;">BOT</span>' : ''}
            <span class="timestamp">${msg.time}</span>
          </div>
          <div class="message-text">${formattedText}</div>
        </div>
      </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', html);
  });
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

channelLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    channelLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    currentChannel = link.getAttribute('data-channel');
    currentChannelText.textContent = currentChannel;
    messageInput.placeholder = `Message #${currentChannel}`;
    renderMessages();
  });
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim() !== '' && currentUser) {
    const text = messageInput.value.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
      id: Date.now(),
      author: currentUser,
      avatarColor: "#5865F2", 
      avatarText: (currentUser[0] || 'U').toUpperCase(),
      isBot: false,
      time: timeStr,
      text: text
    };
    
    if (!messages[currentChannel]) messages[currentChannel] = [];
    messages[currentChannel].push(newMessage);
    localStorage.setItem('discord-clone-messages', JSON.stringify(messages));
    renderMessages();
    messageInput.value = '';

    // Interactive Bot Responses for Demo
    const lower = text.toLowerCase();
    if (lower === '!help' || lower === '/help') {
      setTimeout(() => {
        respondBot("Available commands:\n• **!ip** - Get server IP\n• **!website** - Open Not Donut SMP landing page\n• **!clear** - Clear channel messages");
      }, 350);
    } else if (lower === '!ip') {
      setTimeout(() => {
        respondBot("Server IP: **notdonutsmp.sadhost.com** (Port 25565)");
      }, 350);
    } else if (lower === '!website') {
      setTimeout(() => {
        respondBot("Visit our official landing page: [Not Donut SMP Website](website/)");
      }, 350);
    } else if (lower === '!clear') {
      messages[currentChannel] = [];
      localStorage.setItem('discord-clone-messages', JSON.stringify(messages));
      renderMessages();
    }
  }
});

function respondBot(replyText) {
  const botMessage = {
    id: Date.now(),
    author: "Not Donut Bot",
    avatarColor: "#ff3366",
    avatarText: "B",
    isBot: true,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: replyText
  };
  messages[currentChannel].push(botMessage);
  localStorage.setItem('discord-clone-messages', JSON.stringify(messages));
  renderMessages();
}

// Start
checkAuth();
