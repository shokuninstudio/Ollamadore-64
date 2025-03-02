# Ollamadore 64

Ollamadore 64 is a private ultra lightweight frontend for Ollama that weighs well under 64 kilobytes on disk.

# Description

Ollamadore 64's purpose is to give users a no-install frontend that lets conversations be saved easily as a markdown document with one click. 

Why? I had noticed some Ollama frontends were becoming bloated, were not private when they claimed to be, were not showing users where conversations were being stored, and were not deleting conversations from disk after the user thought they were deleted. Ollamadore 64 resolves that problem by not storing conversations on disk at all unless a user saves the conversation manually.

# Usage

On macOS or Linux simply run 'OLLAMA_ORIGINS=* ollama serve' to get started

```
OLLAMA_ORIGINS=* ollama serve
```

Or just 'ollama serve' on Windows if your environmental variables have been set up.

```
ollama serve
```

Then open the webpage locally to chat. 

[![Watch the video](https://img.youtube.com/vi/aT-i4YVLLGE/default.jpg)](https://youtu.be/aT-i4YVLLGE)

# Features

- Chat with supported text documents
- Paste URL to summarise a webpage (as long as the page is static HTML)
- Save conversations as markdown documents

# Easily themeable 

- So easy you don't even need to do it yourself. Give the CSS and HTML to a model like Qwen Coder and ask it to design new themes for you.


C64 theme:

[![temp-Image-Jgk6-Pk.avif](https://i.postimg.cc/Fz5wtpgS/temp-Image-Jgk6-Pk.avif)](https://postimg.cc/Hcz6XQNW)

