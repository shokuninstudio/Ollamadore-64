const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

class ChatApp {
    constructor() {
        this.messageList = document.getElementById('messageList');
        this.chatForm = document.getElementById('chatForm');
        this.userInput = document.getElementById('userInput');
        this.modelSelect = document.getElementById('modelSelect');
        this.fileInput = document.getElementById('fileInput');
        this.documents = new Map();
        this.webpages = new Map(); // Store webpage contents
        
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        this.currentMessageId = 0;

        this.saveButton = document.getElementById('saveButton');
        this.saveButton.addEventListener('click', () => this.saveConversation());

        // Initialize models
        this.loadModels();
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async fetchWebpage(url) {
        try {
            // Use a CORS proxy to fetch the webpage
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            return data.contents;
        } catch (error) {
            console.error('Error fetching webpage:', error);
            throw error;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.userInput.value.trim();
        if (!message) return;

        const messageId = this.currentMessageId++;
        this.addMessage(message, 'user', messageId);
        this.userInput.value = '';

        // Check if the message contains a URL
        if (this.isValidUrl(message)) {
            try {
                this.addMessage('Fetching webpage content...', 'system', this.currentMessageId++);
                const content = await this.fetchWebpage(message);
                this.webpages.set(message, content);
                this.addMessage(`Webpage content fetched successfully: ${message}`, 'system', this.currentMessageId++);
            } catch (error) {
                this.addMessage(`Failed to fetch webpage: ${error.message}`, 'system', this.currentMessageId++);
            }
        }

        const model = this.modelSelect.value;
        try {
            const responseDiv = this.addMessage('', 'assistant', this.currentMessageId++);
            await this.generateStreamingResponse(model, message, responseDiv);
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Sorry, there was an error generating the response.', 'assistant', this.currentMessageId++);
        }
    }

    addMessage(content, sender, messageId) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.setAttribute('data-id', messageId);
        
        messageDiv.innerHTML = `<div class="message-content"></div>`;
        const contentDiv = messageDiv.querySelector('.message-content');
        
        if (content) {
            marked.setOptions({
                highlight: function(code, language) {
                    if (language && hljs.getLanguage(language)) {
                        return hljs.highlight(code, { language }).value;
                    }
                    return code;
                }
            });
            contentDiv.innerHTML = marked.parse(content);
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }

        if (sender === 'system') {
            messageDiv.classList.add('system-message');
        }

        this.messageList.appendChild(messageDiv);
        this.messageList.scrollTop = this.messageList.scrollHeight;
        return messageDiv;
    }

    async handleFileUpload(files) {
        for (const file of files) {
            try {
                const content = await file.text();
                this.documents.set(file.name, content);
                this.addDocumentMessage(file.name);
            } catch (error) {
                console.error('Error reading file:', error);
            }
        }
        this.fileInput.value = ''; // Reset file input
    }

    addDocumentMessage(filename) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'system-message');
        
        messageDiv.innerHTML = `
            <div class="document-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span>Uploaded: ${filename}</span>
            </div>
        `;
        
        this.messageList.appendChild(messageDiv);
        this.messageList.scrollTop = this.messageList.scrollHeight;
    }

    async generateStreamingResponse(model, prompt, messageDiv) {
        let fullPrompt = prompt;
        let context = '';

        // Add document context if exists
        if (this.documents.size > 0) {
            context += 'Here are the relevant documents:\n\n';
            this.documents.forEach((content, filename) => {
                context += `File: ${filename}\n${content}\n\n`;
            });
        }

        // Add webpage context if exists
        if (this.webpages.size > 0) {
            context += 'Here are the relevant webpages:\n\n';
            this.webpages.forEach((content, url) => {
                context += `URL: ${url}\nContent:\n${content}\n\n`;
            });
        }

        if (context) {
            fullPrompt = context + 'Based on this information, please respond to: ' + prompt;
        }

        const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: fullPrompt
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate response');
        }

        const reader = response.body.getReader();
        const contentDiv = messageDiv.querySelector('.message-content');
        let fullResponse = '';
        let currentMarkdown = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                try {
                    const data = JSON.parse(line);
                    fullResponse += data.response;
                    currentMarkdown = marked.parse(fullResponse);
                    contentDiv.innerHTML = currentMarkdown;
                    
                    // Apply syntax highlighting to any code blocks
                    contentDiv.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                    
                    // Auto-scroll to bottom
                    this.messageList.scrollTop = this.messageList.scrollHeight;
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }

        return fullResponse;
    }

    async loadModels() {
        console.log('Starting to load models...'); // Debug log
        this.modelSelect.innerHTML = '<option disabled>Loading models...</option>';
        
        try {
            console.log('Fetching from:', `${OLLAMA_ENDPOINT}/api/tags`); // Debug log
            const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('Response status:', response.status); // Debug log
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text(); // Get raw response text
            console.log('Raw response:', text); // Debug log
            
            const data = JSON.parse(text);
            console.log('Parsed data:', data); // Debug log
            
            this.modelSelect.innerHTML = '';
            
            if (!data.models || data.models.length === 0) {
                throw new Error('No models found in response');
            }
            
            data.models.forEach(model => {
                console.log('Adding model:', model.name); // Debug log
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                this.modelSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Detailed error loading models:', {
                message: error.message,
                stack: error.stack,
                endpoint: OLLAMA_ENDPOINT
            });
            this.modelSelect.innerHTML = `<option disabled>Error: ${error.message}</option>`;
        }
    }

    saveConversation() {
        console.log('Save button clicked'); // Add this line to verify the method is being called
        // Convert all messages to markdown
        let markdown = '';
        const messages = this.messageList.children;
        
        for (const message of messages) {
            const content = message.querySelector('.message-content');
            const role = message.classList.contains('user-message') ? 'User' : 
                        message.classList.contains('assistant-message') ? 'Assistant' : 'System';
            
            // Skip empty messages
            if (!content.textContent.trim()) continue;
            
            markdown += `## ${role}\n\n`;
            
            // For system messages, just add the text content
            if (role === 'System') {
                markdown += `${content.textContent.trim()}\n\n`;
                continue;
            }
            
            // For user and assistant messages, preserve the original markdown
            const rawContent = content.innerHTML;
            // Convert code blocks back to markdown
            const processedContent = rawContent
                .replace(/<pre><code class="language-(\w+)">/g, '```$1\n')
                .replace(/<\/code><\/pre>/g, '\n```\n')
                .replace(/<code>/g, '`')
                .replace(/<\/code>/g, '`')
                .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
            
            markdown += `${processedContent}\n\n`;
        }

        // Create and trigger download
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `conversation-${timestamp}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
