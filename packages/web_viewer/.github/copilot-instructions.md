# About This Project

This project is a **web viewer for Joplin**, a note-taking application. It provides a modern web interface to browse, search, and view Joplin notes with AI-powered chat assistance.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: React 19, Material-UI (MUI)
- **State Management**: Redux Toolkit, React Query (TanStack Query)
- **Database**: Better-sqlite3 (for Joplin database access)
- **AI/Agent**: LangChain, Model Context Protocol (MCP)
- **Styling**: CSS Modules, Emotion

## Architecture

- **SSR/Client Components**: Mix of server and client components following Next.js App Router patterns
- **API Routes**: Backend logic in `app/api` for accessing Joplin database
- **MCP Server/Client**: Custom MCP server for AI agent integration
- **Database Layer**: Direct SQLite access to Joplin's database

## Folder Structure

### Core Directories

- **`app/`**: Next.js App Router structure
  - `app/api/`: API route handlers (server-side)
    - `note/`, `tree/`, `search/`, `resource/`, `chat/`, `agent/`: Specific endpoints
  - `app/components/`: React client components
    - `NoteViewer.tsx`, `NoteTree.tsx`, `SearchDialog.tsx`, `ChatDialog.tsx`: Main UI components
  - `app/note/`, `app/form/`, `app/redux/`: Page routes

- **`lib/`**: Shared utilities and business logic
  - `database.ts`: SQLite database access layer
  - `note.ts`, `folder.ts`: Data access functions
  - `viewerUtil.ts`, `ClientUtil.ts`: Helper utilities
  - `store.ts`: Redux store configuration
  - `hooks.ts`: Custom React hooks
  - `features/`: Redux slices

- **`mcp/`**: Model Context Protocol implementation
  - `mcp/server/`: MCP server for AI agents
  - `mcp/client/`: MCP client and LangChain integration

- **`public/pluginAssets/`**: Static assets (KaTeX, Mermaid, highlight.js, MathJax)

- **`config.ts`**: Global configuration constants

## Coding Guidelines

### General Principles

1. **Always use TypeScript**: Define proper types and interfaces
2. **Client vs Server Components**:
   - Use `'use client'` directive only when necessary (interactivity, hooks, browser APIs)
   - Prefer server components for data fetching when possible
3. **Error Handling**: Always handle errors gracefully with try-catch and user feedback
4. **Code Style**: Follow ESLint rules (`npm run lint` or `npm run fix`)

### Naming Conventions

- **Components**: PascalCase (`NoteViewer.tsx`)
- **Utilities**: camelCase (`viewerUtil.ts`)
- **API Routes**: lowercase with hyphen (`route.ts` in folders)
- **Types/Interfaces**: PascalCase with descriptive names

### State Management

- **React Query**: Use for server state (API data fetching)
  - Query keys: `['note', noteId]`, `['tree']`, etc.
  - Set appropriate `staleTime` and caching strategies
- **Redux**: Use for global client state (currently: selectedNoteSlice)
- **Local State**: Use `useState` for component-local UI state

### Component Patterns

- **Wrap client components**: Create wrapper components when mixing server/client
- **Use hooks**: Leverage custom hooks from `lib/hooks.ts`
- **Props validation**: Use TypeScript interfaces for prop types
- **Memoization**: Use `useMemo`/`useCallback` for expensive operations

### API Route Structure

```typescript
// app/api/[endpoint]/route.ts
export async function GET(request: NextRequest) {
  try {
    // Extract query params
    // Business logic (use lib/ functions)
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

### Database Access

- Use functions from `lib/database.ts` and `lib/note.ts`
- Never expose database instances to client components
- Always use prepared statements for queries

### Styling

- **Material-UI**: Prefer MUI components with `sx` prop
- **CSS Modules**: For custom styles (`*.module.css`)
- **Emotion**: Use `@emotion/react` for dynamic styles
- **Global styles**: `app/globals.css` and `app/joplin.css`

## Important Configuration

### Environment Variables

- Check for any required env vars in `config.ts`
- `Config.useProxy`: Set to `true` if agent needs HTTP proxy

### Scripts

- `npm run dev`: Development server (copies plugin assets)
- `npm run build`: Production build
- `npm run start`: Production start
- `npm run mcp:dev`/`mcp:server`: Start MCP server
- `npm run agent`: Run LangChain agent client
- `npm run fix`: Format and lint fix

## Common Patterns

### Fetching a Note

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['note', noteId],
  queryFn: async () => {
    const res = await fetch(`/api/note?id=${encodeURIComponent(noteId)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  },
  enabled: !!noteId,
  staleTime: 60_000,
});
```

### Creating New Components

1. Determine if it needs `'use client'` directive
2. Define TypeScript props interface
3. Use MUI components for consistency
4. Handle loading and error states
5. Add to `app/components/` directory

### Adding New API Endpoints

1. Create `app/api/[name]/route.ts`
2. Implement GET/POST handler
3. Use utilities from `lib/` for business logic
4. Return consistent JSON format: `{ success, data/error }`

## MCP and AI Agent

- MCP server exposes tools for AI agents to access Joplin data
- Tools: `getNote`, `searchNotes`, `getNoteTree`, `getFolder`
- LangChain client integrates with MCP using `@langchain/mcp-adapters`
- Chat API routes connect UI to AI agent capabilities

## Dependencies to Note

- **better-sqlite3**: Native SQLite3 binding (may need rebuild)
- **faiss-node**: Vector search (requires native compilation)
- **langchain**: AI/LLM orchestration
- **cheerio**: HTML parsing for note content
- **mark.js**: Text highlighting for search
- **turndown**: HTML to Markdown conversion

## Testing and Quality

- Run `npm run lint` before committing
- Use `npm run fix` to auto-fix formatting and linting issues
- Test both client and server components separately
- Verify MCP server works with `npm run mcp:dev`

## Troubleshooting

- **Native modules**: May need `npm rebuild` for better-sqlite3 or faiss-node
- **Plugin assets**: Run dev/start scripts to copy assets to `public/`
- **Port conflicts**: MCP server uses port 8080 by default
- **Database access**: Ensure Joplin database path is accessible
