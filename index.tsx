import { GoogleGenAI, Chat } from "@google/genai";

// --- TYPES AND INTERFACES ---
interface Message {
    id: number;
    text: string;
    sender: 'user' | 'gemini';
    timestamp: string;
}

interface Settings {
    profilePic: string;
    systemInstruction: string;
    name: string;
}

interface State {
    view: 'list' | 'chat';
    messages: Message[];
    settings: Settings;
    chatListImages: string[];
    isTyping: boolean;
    showSettingsModal: boolean;
    showChatMenu: boolean;
    showOneTimeInstructionModal: boolean;
    oneTimeInstruction: string | null;
}

// --- CONSTANTS AND STATE ---
const LS_KEYS = {
    MESSAGES: 'gemini_chat_messages',
    SETTINGS: 'gemini_chat_settings',
    CHAT_LIST_IMAGES: 'gemini_chat_list_images'
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat;

let state: State = {
    view: 'list',
    messages: [],
    settings: {
        profilePic: 'https://i.ibb.co/3sSj9Q0/gemini-icon.png',
        systemInstruction: 'Eres un asistente útil, amigable y un poco creativo. Responde en español.',
        name: 'Gemini'
    },
    chatListImages: [],
    isTyping: false,
    showSettingsModal: false,
    showChatMenu: false,
    showOneTimeInstructionModal: false,
    oneTimeInstruction: null,
};

// --- STATE AND DATA MANAGEMENT ---

function saveState() {
    localStorage.setItem(LS_KEYS.MESSAGES, JSON.stringify(state.messages));
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(state.settings));
    localStorage.setItem(LS_KEYS.CHAT_LIST_IMAGES, JSON.stringify(state.chatListImages));
}

function loadState() {
    const savedMessages = localStorage.getItem(LS_KEYS.MESSAGES);
    const savedSettings = localStorage.getItem(LS_KEYS.SETTINGS);
    const savedChatListImages = localStorage.getItem(LS_KEYS.CHAT_LIST_IMAGES);

    if (savedMessages) {
        state.messages = JSON.parse(savedMessages);
    }
    if (savedSettings) {
        const loadedSettings = JSON.parse(savedSettings);
        state.settings = { name: 'Gemini', ...loadedSettings };
    }
    if (savedChatListImages) {
        state.chatListImages = JSON.parse(savedChatListImages);
    }
}

function initGeminiChat() {
    const history = state.messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: state.settings.systemInstruction,
        },
        history,
    });
}

// --- RENDER FUNCTIONS ---
const appContainer = document.getElementById('app')!;

function render() {
    appContainer.innerHTML = ''; // Clear previous content
    
    if (state.view === 'list') {
        appContainer.appendChild(renderChatListScreen());
    } else {
        appContainer.appendChild(renderChatScreen());
    }
    
    if(state.showSettingsModal) {
        appContainer.appendChild(renderSettingsModal());
    }
    if(state.showOneTimeInstructionModal) {
        appContainer.appendChild(renderOneTimeInstructionModal());
    }
}

function renderChatListScreen() {
    const screen = document.createElement('div');
    screen.className = 'screen';
    
    const lastMessage = state.messages[state.messages.length - 1];
    const previewText = lastMessage ? lastMessage.text : 'Toca para chatear con la IA';
    const lastTime = lastMessage ? lastMessage.timestamp : '';

    const chatListImagesHTML = state.chatListImages.map(imgSrc => 
        `<div class="chat-list-image-container"><img src="${imgSrc}" alt="Chat list screenshot"></div>`
    ).join('');

    screen.innerHTML = `
        <div class="header">
            <h1>WhatsApp</h1>
            <div class="header-icons">
                <span class="material-symbols-outlined">photo_camera</span>
                <span class="material-symbols-outlined">search</span>
                <span class="material-symbols-outlined">more_vert</span>
            </div>
        </div>
        <div class="chat-list-content">
            <div class="chat-item" id="gemini-chat-item">
                <img src="${state.settings.profilePic}" alt="Foto de perfil de ${state.settings.name}">
                <div class="chat-details">
                    <div class="chat-details-header">
                        <h2>${state.settings.name}</h2>
                        <time>${lastTime}</time>
                    </div>
                    <p class="chat-preview">${previewText}</p>
                </div>
            </div>
            ${chatListImagesHTML}
        </div>
        <div class="fab">
            <span class="material-symbols-outlined">chat</span>
        </div>
        <div class="footer-nav">
            <div class="nav-item active">
                <span class="material-symbols-outlined">chat</span>
                <span>Chats</span>
            </div>
            <div class="nav-item">
                <span class="material-symbols-outlined">update</span>
                <span>Novedades</span>
            </div>
            <div class="nav-item">
                <span class="material-symbols-outlined">groups</span>
                <span>Comunidades</span>
            </div>
            <div class="nav-item">
                <span class="material-symbols-outlined">call</span>
                <span>Llamadas</span>
            </div>
        </div>
    `;

    screen.querySelector('#gemini-chat-item')!.addEventListener('click', () => {
        state.view = 'chat';
        render();
    });

    return screen;
}

function renderChatScreen() {
    const screen = document.createElement('div');
    screen.className = 'screen';
    
    const header = document.createElement('div');
    header.className = 'header chat-header';
    header.innerHTML = `
        <span class="material-symbols-outlined back-arrow">arrow_back</span>
        <div class="chat-header-info">
            <img src="${state.settings.profilePic}" alt="Foto de perfil de ${state.settings.name}">
            <h2>${state.settings.name}</h2>
        </div>
        <div class="header-icons">
            <span class="material-symbols-outlined">videocam</span>
            <span class="material-symbols-outlined">call</span>
            <span class="material-symbols-outlined" id="settings-button">more_vert</span>
        </div>
    `;

    if (state.showChatMenu) {
        header.appendChild(renderChatMenu());
    }
    
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';
    
    state.messages.forEach(msg => {
        chatContainer.appendChild(createMessageBubble(msg));
    });

    if (state.isTyping) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `<span></span><span></span><span></span>`;
        chatContainer.appendChild(typingIndicator);
    }

    const footer = document.createElement('form');
    footer.className = 'chat-footer';
    footer.innerHTML = `
        <div class="chat-input-container">
            <span class="material-symbols-outlined">mood</span>
            <input type="text" id="message-input" placeholder="Mensaje" autocomplete="off">
            <span class="material-symbols-outlined">attach_file</span>
            <span class="material-symbols-outlined">photo_camera</span>
        </div>
        <button type="submit" class="send-button">
            <span class="material-symbols-outlined">send</span>
        </button>
    `;

    screen.appendChild(header);
    screen.appendChild(chatContainer);
    screen.appendChild(footer);

    setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 0);
    
    header.querySelector('.back-arrow')!.addEventListener('click', () => {
        state.view = 'list';
        render();
    });
    
    header.querySelector('#settings-button')!.addEventListener('click', (e) => {
        e.stopPropagation();
        state.showChatMenu = !state.showChatMenu;
        render();
    });
    
    footer.addEventListener('submit', handleSendMessage);
    
    return screen;
}

function renderChatMenu() {
    const menu = document.createElement('div');
    menu.className = 'chat-header-menu';
    menu.innerHTML = `
        <ul>
            <li id="one-time-instruction-btn">Instrucción para un solo uso</li>
            <li id="ai-settings-btn">Configuración de IA</li>
        </ul>
    `;

    menu.querySelector('#one-time-instruction-btn')!.addEventListener('click', () => {
        state.showOneTimeInstructionModal = true;
        state.showChatMenu = false;
        render();
    });

    menu.querySelector('#ai-settings-btn')!.addEventListener('click', () => {
        state.showSettingsModal = true;
        state.showChatMenu = false;
        render();
    });
    
    const closeMenu = () => {
        if (state.showChatMenu) {
            state.showChatMenu = false;
            render();
            document.body.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.body.addEventListener('click', closeMenu), 0);

    return menu;
}


function createMessageBubble(message: Message) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble message-${message.sender}`;
    bubble.innerHTML = `
        <div class="text">${message.text}</div>
        <div class="timestamp">${message.timestamp}</div>
    `;
    return bubble;
}

function renderOneTimeInstructionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
        <div class="modal-content">
            <h3>Instrucción para un solo uso</h3>
            <p class="modal-description">La siguiente respuesta de la IA seguirá esta instrucción, sin afectar a su personalidad general.</p>
            <div class="form-group">
                <label for="one-time-instruction-input">Instrucción</label>
                <textarea id="one-time-instruction-input" placeholder="Ej: Contesta como un pirata"></textarea>
            </div>
            <div class="modal-buttons">
                <button class="button-cancel" id="cancel-one-time">CANCELAR</button>
                <button class="button-save" id="save-one-time">ENVIAR</button>
            </div>
        </div>
    `;
    
    const closeModal = () => {
       state.showOneTimeInstructionModal = false;
       render();
    };

    modal.querySelector('#cancel-one-time')!.addEventListener('click', closeModal);
    modal.querySelector('#save-one-time')!.addEventListener('click', handleSaveOneTimeInstruction);
    modal.querySelector('.modal-content')!.addEventListener('click', (e) => e.stopPropagation());
    modal.addEventListener('click', closeModal);

    return modal;
}


function renderSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    const picInputValue = state.settings.profilePic.startsWith('data:image') ? 'Imagen local cargada' : state.settings.profilePic;

    modal.innerHTML = `
        <div class="modal-content">
            <h3>Configuración de IA</h3>
            <div class="form-group">
                <label for="ai-name">Nombre de la IA</label>
                <input type="text" id="ai-name" value="${state.settings.name}">
            </div>
            <div class="form-group">
                <label>Foto de perfil</label>
                <div class="profile-pic-editor">
                    <img src="${state.settings.profilePic}" alt="Vista previa" class="profile-pic-preview">
                    <div class="profile-pic-inputs">
                        <input type="text" id="profile-pic-url" placeholder="O pega una URL aquí" value="${picInputValue}">
                        <label for="profile-pic-upload" class="button-upload-small">SUBIR FOTO</label>
                        <input type="file" id="profile-pic-upload" accept="image/*" style="display: none;">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="system-instruction">Rol y personalidad de la IA</label>
                <textarea id="system-instruction">${state.settings.systemInstruction}</textarea>
            </div>
            <hr/>
            <h3>Simular Lista de Chats</h3>
            <p class="modal-description">Sube capturas de pantalla. Cada imagen aparecerá como una conversación separada.</p>
            <div class="chat-list-image-uploader">
                 <div id="chat-list-previews" class="chat-list-previews-grid">
                    ${state.chatListImages.map((imgSrc, index) => `
                        <div class="chat-list-preview-item">
                            <img src="${imgSrc}" alt="Vista previa de chat">
                            <button class="remove-preview-btn" data-index="${index}">&times;</button>
                        </div>
                    `).join('')}
                </div>
                <label for="chat-list-images-upload" class="button-upload">AÑADIR IMÁGENES</label>
                <input type="file" id="chat-list-images-upload" accept="image/*" multiple style="display: none;">
            </div>
            <div class="modal-buttons">
                <button class="button-cancel" id="cancel-settings">CANCELAR</button>
                <button class="button-save" id="save-settings">GUARDAR</button>
            </div>
        </div>
    `;
    
    modal.querySelector('#cancel-settings')!.addEventListener('click', () => {
       state.showSettingsModal = false;
       render();
    });
    
    modal.querySelector('#save-settings')!.addEventListener('click', handleSaveSettings);

    modal.querySelector('#profile-pic-upload')!.addEventListener('change', handleProfilePicUpload);
    modal.querySelector('#chat-list-images-upload')!.addEventListener('change', handleChatListImagesUpload);
    modal.querySelector('#chat-list-previews')!.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('remove-preview-btn')) {
            handleRemoveChatListImage(e);
        }
    });
    
    modal.querySelector('.modal-content')!.addEventListener('click', (e) => e.stopPropagation());
    modal.addEventListener('click', () => {
        state.showSettingsModal = false;
        render();
    });

    return modal;
}

// --- EVENT HANDLERS AND LOGIC ---
async function handleSendMessage(event: Event) {
    event.preventDefault();
    const input = document.getElementById('message-input') as HTMLInputElement;
    const text = input.value.trim();

    if (!text) return;

    const userMessage: Message = {
        id: Date.now(),
        text,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
    state.messages.push(userMessage);
    state.isTyping = true;
    const instructionForThisMessage = state.oneTimeInstruction;
    state.oneTimeInstruction = null;
    input.value = '';
    render();
    
    try {
        let geminiResponseText: string;

        if (instructionForThisMessage) {
            const fullHistory = state.messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullHistory,
                config: {
                    systemInstruction: instructionForThisMessage,
                }
            });
            geminiResponseText = response.text;
            initGeminiChat();
        } else {
            const response = await chat.sendMessage({ message: text });
            geminiResponseText = response.text;
        }
        
        const geminiMessage: Message = {
            id: Date.now() + 1,
            text: geminiResponseText,
            sender: 'gemini',
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        state.messages.push(geminiMessage);

    } catch (error) {
        console.error("Error al contactar con la API de Gemini:", error);
        const errorMessage: Message = {
            id: Date.now() + 1,
            text: "Lo siento, he tenido un problema para conectar. Inténtalo de nuevo.",
            sender: 'gemini',
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        state.messages.push(errorMessage);
    } finally {
        state.isTyping = false;
        saveState();
        render();
    }
}

function handleSaveOneTimeInstruction() {
    const instructionInput = document.getElementById('one-time-instruction-input') as HTMLTextAreaElement;
    const instruction = instructionInput.value.trim();

    if (instruction) {
        state.oneTimeInstruction = instruction;
    }

    state.showOneTimeInstructionModal = false;
    render();
}

function handleProfilePicUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const newPicData = e.target?.result as string;
        state.settings.profilePic = newPicData;
        
        // Update UI elements in the modal without a full re-render
        const preview = document.querySelector('.profile-pic-preview') as HTMLImageElement;
        const urlInput = document.getElementById('profile-pic-url') as HTMLInputElement;
        if (preview) preview.src = newPicData;
        if (urlInput) urlInput.value = 'Imagen local cargada';
    };
    reader.readAsDataURL(file);
}

function handleChatListImagesUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    let filesProcessed = 0;
    for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.chatListImages.push(e.target?.result as string);
            filesProcessed++;
            if (filesProcessed === files.length) {
                render(); // Re-render the modal once all images are loaded
            }
        };
        reader.readAsDataURL(file);
    }
}

function handleRemoveChatListImage(event: Event) {
    const target = event.target as HTMLElement;
    const indexToRemove = parseInt(target.dataset.index!, 10);
    if (!isNaN(indexToRemove)) {
        state.chatListImages.splice(indexToRemove, 1);
        render(); // Re-render to update the previews
    }
}

function handleSaveSettings() {
    const nameInput = document.getElementById('ai-name') as HTMLInputElement;
    const picInput = document.getElementById('profile-pic-url') as HTMLInputElement;
    const instructionInput = document.getElementById('system-instruction') as HTMLTextAreaElement;

    const newName = nameInput.value.trim();
    const newInstruction = instructionInput.value.trim();
    
    // If the input value is the placeholder for local image, we keep the existing base64 string in the state.
    // Otherwise, we use the new value from the input (it might be a new URL).
    const newPic = picInput.value !== 'Imagen local cargada' ? picInput.value.trim() : state.settings.profilePic;

    const needsChatReset = state.settings.systemInstruction !== newInstruction || state.settings.name !== newName;

    state.settings.name = newName;
    state.settings.profilePic = newPic;
    state.settings.systemInstruction = newInstruction;
    
    state.showSettingsModal = false;
    
    if (needsChatReset) {
        state.messages = [];
        // Add the initial message back after reset
        state.messages.push({
            id: Date.now(),
            text: `¡Hola! Soy ${state.settings.name}. Puedes cambiar mi personalidad en los ajustes. ¿Sobre qué quieres hablar?`,
            sender: 'gemini',
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        });
        initGeminiChat();
    }
    
    saveState();
    render();
}

// --- INITIALIZATION ---
function main() {
    loadState();
    if (state.messages.length === 0) {
        state.messages.push({
            id: Date.now(),
            text: `¡Hola! Soy ${state.settings.name}. Puedes cambiar mi personalidad en los ajustes (icono de 3 puntos arriba a la derecha). ¿Sobre qué quieres hablar?`,
            sender: 'gemini',
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        });
    }
    initGeminiChat();
    render();
}

main();