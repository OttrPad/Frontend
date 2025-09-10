# OttrPad - Collaborative Real-Time Code Editor

A production-ready collaborative web-based real-time code editor built with React, TypeScript, Monaco Editor, and modern UI components.

## 🚀 Features

### 📝 Collaborative Notebook Interface

- **Jupyter-like Block System**: Create, edit, and manage code blocks with multiple language support
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting, autocompletion, and IntelliSense
- **Drag & Drop Reordering**: Intuitive block management with keyboard accessibility
- **Language Support**: Python, JavaScript, TypeScript, HTML, CSS, JSON, and Markdown

### 📁 File Management

- **Virtual File System**: In-memory project structure with folders and files
- **File Tree Navigation**: Expandable/collapsible folder structure
- **Context Menu Actions**: Create, rename, delete, and organize files and folders
- **File Editing**: Open files directly in Monaco Editor

### 🏃‍♂️ Code Execution (Mock)

- **Block Execution**: Run individual code blocks with output display
- **Batch Execution**: Run all blocks sequentially
- **Output Management**: Collapsible output areas with error handling
- **Execution State**: Visual indicators for running, completed, and failed executions

### 📊 Right Panel Features

#### 🖥️ Run Output

- **Execution Logs**: Comprehensive output tracking with timestamps
- **Error Display**: Formatted error messages with stack traces
- **Command History**: Track all executed commands and their results

#### 🧪 Tests

- **Test Discovery**: Automatic detection of test files
- **Individual Test Runs**: Execute specific tests with detailed output
- **Test Status**: Visual indicators for passed, failed, and running tests
- **Test Results**: Comprehensive test output and error reporting

#### 📈 Versions & Milestones

- **Milestone System**: Save snapshots of your workspace
- **Diff Viewer**: Compare current state with saved milestones using Monaco Diff Editor
- **Version History**: Track project evolution with timestamps and notes
- **Restore Functionality**: Rollback to previous versions

#### 🤖 AI Assist

- **Interactive Chat**: Ask questions about your code
- **Code Suggestions**: Get AI-generated code snippets
- **Quick Actions**: Insert suggestions directly into blocks
- **Context Awareness**: AI understands your project structure

### 👥 Collaboration Features

- **Presence Avatars**: See who's currently in the workspace
- **User Indicators**: Visual representation of active collaborators
- **Mock Real-time**: Prepared for Socket.IO integration

### ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + Enter`: Add new block
- `Shift + Enter`: Run current block
- `Ctrl/Cmd + Shift + Enter`: Run all blocks
- `Ctrl/Cmd + S`: Save milestone
- `Alt + ↑/↓`: Move block up/down
- `?`: Show keyboard shortcuts help
- `Escape`: Close modals/menus

### 🎨 UI/UX Features

- **Dark/Light Theme**: Toggle between themes with Monaco integration
- **Responsive Design**: Adaptive layout for different screen sizes
- **Resizable Panels**: Adjustable sidebar and right panel widths
- **Smooth Animations**: Polished transitions and interactions
- **Accessibility**: Keyboard navigation and screen reader support

## 🛠️ Tech Stack

### Core Technologies

- **React 19**: Latest React with modern features
- **TypeScript**: Full type safety and IntelliSense
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

### State Management

- **Zustand**: Lightweight state management with devtools
- **Modular Stores**: Separate stores for files, blocks, milestones, presence, etc.

### Code Editor

- **Monaco Editor**: VS Code's editor with full language support
- **Custom Themes**: OttrPad-branded light and dark themes
- **Language Services**: Syntax highlighting, autocompletion, and error detection

### UI Components

- **shadcn/ui**: Modern, accessible component library
- **Lucide React**: Beautiful icon set
- **Radix UI**: Unstyled, accessible UI primitives

### Drag & Drop

- **dnd-kit**: Modern drag and drop for React
- **Keyboard Accessible**: Full keyboard support for reordering

### Routing

- **React Router**: Client-side routing with workspace URLs

## 📁 Project Structure

```
src/
├── components/
│   ├── monaco/              # Monaco Editor components
│   │   ├── MonacoEditor.tsx
│   │   └── MonacoDiff.tsx
│   ├── workspace/           # Main workspace components
│   │   ├── EditorTopbar.tsx
│   │   ├── FilesSidebar.tsx
│   │   ├── NotebookArea.tsx
│   │   ├── Block.tsx
│   │   ├── BlockOutput.tsx
│   │   ├── RightPanel.tsx
│   │   ├── PresenceAvatars.tsx
│   │   └── ContextMenu.tsx
│   ├── workspace/panels/    # Right panel components
│   │   ├── RunOutputPane.tsx
│   │   ├── TestsPane.tsx
│   │   ├── VersionsPane.tsx
│   │   └── AIAssistPane.tsx
│   ├── modals/              # Modal dialogs
│   │   ├── SaveMilestoneDialog.tsx
│   │   ├── RenameDialog.tsx
│   │   └── KeyboardShortcutsModal.tsx
│   └── ui/                  # Base UI components
├── store/                   # Zustand stores
│   └── workspace.ts
├── types/                   # TypeScript type definitions
│   └── workspace.ts
├── hooks/                   # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── pages/                   # Route components
│   ├── auth/
│   ├── rooms/
│   └── workspace/
└── lib/                     # Utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd realtime-code-editor/frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure the following variables in your `.env` file:

   ```env
   # Backend API Configuration
   VITE_API_URL=http://localhost:4000
   VITE_BACKEND_URL=http://localhost:4000

   # Chat Service Configuration (Collaboration Service)
   VITE_CHAT_URL=http://localhost:5002

   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🧭 Navigation Flow

1. **Landing Page** (`/`) - Login/authentication
2. **Rooms Page** (`/join`) - Create or join collaboration rooms
3. **Workspace** (`/workspace/:roomId`) - Main editor interface

## 💡 Usage Guide

### Creating Your First Workspace

1. Navigate to the rooms page
2. Either join an existing room with a 6-digit code or create a new room
3. You'll be redirected to the workspace interface

### Working with Code Blocks

1. **Add Block**: Click "Add Block" or press `Ctrl/Cmd + Enter`
2. **Select Language**: Click the language selector to change from Python
3. **Edit Code**: Click in the Monaco editor and start typing
4. **Run Code**: Click the play button or press `Shift + Enter`
5. **View Output**: Expand the output section below the block

### File Management

1. **Create Files/Folders**: Use the + buttons in the Files sidebar
2. **Navigate**: Click folders to expand/collapse
3. **Context Menu**: Right-click for rename, delete, and other actions
4. **Open Files**: Click a file to open it in the editor

### Saving Progress

1. **Auto-save**: Content is automatically saved as you type
2. **Milestones**: Click "Save Milestone" or press `Ctrl/Cmd + S`
3. **Version History**: Use the Versions tab to view and compare snapshots

### Using the Right Panel

- **Run Output**: View execution results and command history
- **Tests**: Manage and run test files
- **Versions**: Compare with previous milestones
- **AI Assist**: Get coding help and suggestions

## 🔮 Future Enhancements

### Real-time Collaboration

- Socket.IO integration for live collaboration
- Operational Transform for conflict resolution
- Real-time cursor and selection sharing

### Code Execution

- Backend integration for actual code execution
- Multiple runtime environments (Python, Node.js, etc.)
- Package management and dependency installation

### Advanced Features

- Git integration for version control
- Plugin system for extensions
- Custom themes and editor settings
- Export/import functionality

### Performance

- Virtual scrolling for large files
- Code splitting and lazy loading
- Service worker for offline support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Monaco Editor team for the excellent code editor
- shadcn for the beautiful UI components
- Zustand team for the lightweight state management
- React and TypeScript communities for the amazing ecosystem

---

**OttrPad** - Collaborate. Create. Code. 🦦
