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
- AI responses via Google's GenAI SDK

# Tech-stack
- Frontend: React + TypeScript + ReactFlow (for canvas-based UX)
- Backend: Serverless API routes via Vercel, analytics w/ Redis
- Data: IndexedDB (per client, no accounts yet)
- AI layer: Google GenAI SDK

# Future Work
### UX
- Reusable canvas templates/personas
- Update ancestor chats (with new context propagating downwards)
- Drag and drop nodes into new trees (and possibly across canvases)
- Quickly compare different branches in chat view
- Merge similar branches
### AI
- Better context engineering (ex: context compression, pruning, etc.)
- Model switching with BYOK model
- Local inference & encrypted messages for privacy
- Agentic workflows
### Infra
- Import/export canvases
- Account system with cloud persistence
