let isLoginMode = true;
let currentUser = null;

let messages = JSON.parse(localStorage.getItem('discord-clone-messages')) || {
  welcome: [{ id: 1, author: "Not Donut Bot", avatarColor: "#ff3366", avatarText: "B", isBot: true, time: "Today at 12:00 PM", text: "Welcome! Create an account above to chat." }],
  general: []
};
let currentChannel = 'welcome';

// UI Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authError = document.getElementById('auth-error');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const channelLinks = document.querySelectorAll('.channel');
const currentChannelText = document.getElementById('current-channel');

// --- AUTH LOGIC ---

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      showApp();
    } else {
      showAuth();
    }
  } catch (e) {
    showAuth();
  }
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  
  // Update profile UI
  document.getElementById('user-display-name').textContent = currentUser;
  document.getElementById('user-avatar').textContent = currentUser[0].toUpperCase();
  
  renderMessages();
}

function showAuth() {
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

function toggleAuthMode(e) {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  document.querySelector('.auth-box h1').textContent = isLoginMode ? "Welcome back!" : "Create an account";
  document.getElementById('auth-submit').textContent = isLoginMode ? "Log In" : "Register";
  document.getElementById('auth-switch-text').textContent = isLoginMode ? "Need an account?" : "Already have an account?";
  document.querySelector('.auth-switch a').textContent = isLoginMode ? "Register" : "Log In";
  authError.textContent = "";
}

async function handleAuth() {
  // Changed to match the new IDs
  const username = document.getElementById('auth-user-key').value.trim();
  const password = document.getElementById('auth-pass-code').value;
  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  
  if (!username || !password) {
    authError.textContent = "Please fill in all fields.";
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) // The backend still expects 'username' and 'password'
    });
    
    const data = await res.json();
    
    if (res.ok) {
      currentUser = data.username;
      showApp();
    } else {
      authError.textContent = data.error || "Authentication failed";
    }
  } catch (err) {
    authError.textContent = "Network error. Is the server running?";
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  showAuth();
}

// --- CHAT LOGIC ---

function renderMessages() {
  chatContainer.innerHTML = '';
  const channelMessages = messages[currentChannel] || [];
  
  if (channelMessages.length === 0) {
    chatContainer.innerHTML = `<div style="text-align: center; color: #949ba4; margin-top: 50px;">Welcome to #${currentChannel}!</div>`;
    return;
  }

  channelMessages.forEach(msg => {
    let formattedText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    const html = `
      <div class="message">
        <div class="avatar" style="background-color: ${msg.avatarColor};">${msg.avatarText}</div>
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
    const newMessage = {
      id: Date.now(),
      author: currentUser,
      avatarColor: "#5865F2", 
      avatarText: currentUser[0].toUpperCase(),
      isBot: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text
    };
    
    if (!messages[currentChannel]) messages[currentChannel] = [];
    messages[currentChannel].push(newMessage);
    localStorage.setItem('discord-clone-messages', JSON.stringify(messages));
    renderMessages();
    messageInput.value = '';
  }
});

// Start
checkAuth();