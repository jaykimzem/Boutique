class FashionBot {
    constructor() {
        this.container = null;
        this.messagesContainer = null;
        this.input = null;
        this.isOpen = false;

        // System Prompt for consistent Persona
        // System Prompt for consistent Persona
        // System Prompt for consistent Persona
        // System Prompt for consistent Persona
        this.systemPrompt = `
AI AGENT DIRECTIVES - ANNE'S FASHION LINE (NAIROBI EDITION)

ROLE: "Nairobi Hype-Girl" / Bestie.
AUDIENCE: Gen Z/Millennials in Kenya.

⚠️ CRITICAL RULES (DO NOT BREAK):
1. **LENGTH**: MAX 2 SHORT SENTENCES. No paragraphs. Keep it snappy!
2. **LANGUAGE**: MIX English with HEAVY Nairobi Slang (Sheng).
   - Use: "Manze", "Wueh!", "Mali safi", "Cheki", "Hii ni fire", "Form", "Sis", "Babe", "Kuwa serious", "Wallahi".
3. **NAVIGATION**: If a user asks for a category (e.g., "Do you have dresses?"), send them a LINK.
   - Format: "Cheki our <a href='dresses.html'>Dresses Here</a> babe! 👗"
   - Pages: casual.html, corporate.html, weekend.html, dresses.html, wigs.html, makeup.html, shoes.html.

EXAMPLE CHATS:
User: "Do you have heels?"
AI: "Eish! We have the deadliest <a href='shoes.html'>Heels</a> in town! 👠 Check them out mum!"

User: "Is this dress nice?"
AI: "Wueh! Manze it fits like a glove! 🔥 You'll look mali safi proper! 😍"

User: "Where are the wigs?"
AI: "Form ni wigs? Cheki our <a href='wigs.html'>Hair Collection</a> hapa! 💇‍♀️✨"

User: "Price?"
AI: "Babe, chat with the Team kidogo for the best deal! 💖"
        `;

        // Store chat history for context
        this.history = [];
        this.contextString = '';
    }

    init() {
        // Inject HTML (Container + Launcher Button)
        const html = `
            <!-- Floating Launcher Button -->
            <button class="chatbot-launcher" id="chatLauncher">
                <i class="fas fa-comment-dots"></i>
            </button>

            <!-- Chat Container -->
            <div class="chatbot-container" id="chatbot">
                <div class="chat-header">
                    <div class="chat-profile">
                        <img src="assets/instagram/photos/Makeup.jpg" alt="AnneAI" class="chat-avatar">
                        <div class="chat-info">
                            <h3>Anne's Assistant</h3>
                            <span>Active now</span>
                        </div>
                    </div>
                    <button class="btn-close-chat" id="closeChat"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="message bot">
                        Hi babe! 👋 Start a Try-On and I'll help you decide!
                    </div>
                </div>

                <div class="chat-input-area">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                    <button class="btn-send-chat" id="sendChat"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Elements
        this.container = document.getElementById('chatbot');
        this.messagesContainer = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');
        this.launcher = document.getElementById('chatLauncher'); // New Launcher
        const closeBtn = document.getElementById('closeChat');
        const sendBtn = document.getElementById('sendChat');

        // Events
        closeBtn.addEventListener('click', () => this.close());
        this.launcher.addEventListener('click', () => this.open('user_click')); // Open on click
        sendBtn.addEventListener('click', () => this.handleUserMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserMessage();
        });

        // Load History from Session (Persistence)
        this.loadHistory();
    }

    open(triggerReason = 'default', contextData = null) {
        if (!this.container) this.init();

        this.container.classList.add('active');
        this.launcher.classList.add('hidden'); // Hide launcher when active
        this.isOpen = true;
        sessionStorage.setItem('annes_bot_open', 'true');

        // Reset or Update Context
        if (contextData) {
            this.contextString = `\n[CURRENT USER CONTEXT]\nProduct: ${contextData.productName}\nBody Type: ${contextData.activeBodyType}\nSkin Tone: ${contextData.activeTone}\nGenerated Image provided to user.`;
            sessionStorage.setItem('annes_bot_context', this.contextString);
        } else {
            // Restore context if available
            this.contextString = sessionStorage.getItem('annes_bot_context') || "";
        }

        if (triggerReason === 'try_on_complete') {
            this.addTyping();

            // Initial Proactive Message
            setTimeout(() => {
                this.removeTyping();
                const initialMsg = "Hi babe! 😍 Eish! How are we feeling about this outfit? 🔥";
                this.addMessage(initialMsg, 'bot');
                // CRITICAL: Push to history so the AI knows it started the convo
                this.history.push({ role: 'assistant', content: initialMsg });
                this.saveHistory(); // Save initial msg

                // Add Quick Replies
                this.addQuickReplies(['Manze I love it! 😍', 'Not sure... 😕', 'Is it giving? ✨']);
            }, 800);

        } else if (triggerReason === 'first_visit') {
            // Passive open
        }
    }

    close() {
        if (this.container) {
            this.container.classList.remove('active');
            this.launcher.classList.remove('hidden'); // Show launcher
            this.isOpen = false;
            sessionStorage.setItem('annes_bot_open', 'false');
        }
    }

    saveHistory() {
        sessionStorage.setItem('annes_bot_history', JSON.stringify(this.history));
    }

    loadHistory() {
        const savedHistory = sessionStorage.getItem('annes_bot_history');
        if (savedHistory) {
            this.history = JSON.parse(savedHistory);
            // Re-render messages
            this.messagesContainer.innerHTML = ''; // Clear default greeting
            this.history.forEach(msg => this.addMessage(msg.content, msg.role === 'assistant' ? 'bot' : 'user', false));
        }

        // Restore State
        if (sessionStorage.getItem('annes_bot_open') === 'true') {
            this.open('restore');
        }
    }

    addMessage(text, sender, save = true) {
        // Remove quick replies if they exist
        const oldReplies = this.messagesContainer.querySelector('.quick-replies');
        if (oldReplies) oldReplies.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        // Use innerHTML to allow links
        msgDiv.innerHTML = text;
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        if (save) {
            // But let's verify where history is pushed.
            // 'history.push' happens elsewhere. saving should happen there.
        }
    }

    addQuickReplies(options) {
        const container = document.createElement('div');
        container.className = 'quick-replies';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn';
            btn.textContent = opt;
            btn.onclick = () => {
                this.addMessage(opt, 'user');
                this.history.push({ role: 'user', content: opt });
                this.saveHistory(); // Save after quick reply
                this.generateResponse(opt);
                container.remove();
            };
            container.appendChild(btn);
        });

        this.messagesContainer.appendChild(container);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    handleUserMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        this.history.push({ role: 'user', content: text });
        this.saveHistory(); // Save after user msg
        this.input.value = '';
        this.generateResponse(text);
    }

    addTyping() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator message bot';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        indicator.style.display = 'flex';
        indicator.id = 'typingIndicator';
        this.messagesContainer.appendChild(indicator);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    removeTyping() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    async generateResponse(userText) {
        this.addTyping();

        try {
            // 1. Construct Conversation History (Last 6 exchanges to keep context but save tokens)
            const recentHistory = this.history.slice(-6).map(msg => {
                return `${msg.role === 'user' ? 'Client' : 'Anne\'s Assistant'}: ${msg.content}`;
            }).join('\n');

            // 2. Build the "Mega Prompt"
            // System Prompt (Identity) + Context (Product/Image) + History (Memory) + Current User Input
            const fullPrompt = `
${this.systemPrompt}

${this.contextString || "[No product context active. Client is browsing.]"}

[CONVERSATION HISTORY]
${recentHistory}

[CURRENT MESSAGE]
Client: ${userText}
Anne's Assistant:
            `;

            // 3. Send to AI
            const aiResponse = await window.Putter.chat(fullPrompt, this.systemPrompt); // Redundant system prompt passing, but safe.

            this.removeTyping();
            this.addMessage(aiResponse, 'bot');
            this.history.push({ role: 'assistant', content: aiResponse });
            this.saveHistory(); // Save after bot reply

        } catch (error) {
            console.error("Chatbot Error:", error);
            this.removeTyping();

            // Debugging: Show actual error
            const fallback = `Debug Error: ${error.message || error}`;
            this.addMessage(fallback, 'bot');
            // Do not save error messages to history ideally, or maybe we do?
        }
    }
}

// Global instance
window.fashionBot = new FashionBot();

// Auto-init on load
// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    window.fashionBot.init();

    // Auto-Open on First Visit
    // Check if user has seen the bot before
    const hasSeenBot = localStorage.getItem('annes_bot_seen');

    if (!hasSeenBot) {
        // Wait a few seconds before popping up to not be annoying
        setTimeout(() => {
            // Only open if not already open (e.g. from session restore)
            if (!window.fashionBot.isOpen) {
                window.fashionBot.open('first_visit');
                localStorage.setItem('annes_bot_seen', 'true');
            }
        }, 3000); // 3-second delay
    }
});
