# Thoughts

A canvas-based AI interface with branching conversation nodes.

*Thoughts* lets you interact with LLMs in a non-linear way. Instead of one long chat, you can branch ideas into multiple paths and explore them visually. 

Demo: https://thoughts-lime.vercel.app/

# Why this exists

Traditional interfaces are inherently linear, which makes it harder to branch out into different conversations or revisit earlier messages. Even ChatGPT's "branching" feature works by simply duplicating the old linear chat. *Thoughts* solves this with a canvas-and-node-based interface (built with Reactflow), allowing branches to be visualized and added seamlessly. 

# Features
- Infinite canvas with zoom/pan
- Node-based conversation system
- Context inheritance across branches
- AI-powered responses via Google's GenAI SDK

# Tech-stack
- Frontend: React + TypeScript + ReactFlow (for canvas-based UX)
- Backend: Serverless API routes via Vercel
- AI layer: Google GenAI SDK

# Future Work
### UX
- Expand node leads to a full chat view, allowing a single node to be treated as a linear chat
- Better node layouts, with possibly user-customizable arrangements
- Update ancestor chats (with new context propagating downwards)
- Drag and drop nodes into new trees (and possibly across canvases)
### Product
- Multiple canvases
- Persistence
### AI
- Better context engineering (ex: context compression, pruning, etc.)
- Model switching
- Agentic workflows
### Infra
- Persistent storage
- Authentication
- Rate limits
