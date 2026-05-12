# careeright-mcp

`careeright-mcp` is a stdio MCP bridge for Careeright. It lets local AI clients such as Claude Desktop, Claude Code-style tools, Codex, and Gemini-compatible MCP clients talk to your signed-in Careeright workspace through the app's authenticated `/mcp` endpoint.

The package does not connect to MongoDB and does not create board tasks directly. Careeright keeps auth, proposal review, task creation, and user ownership inside the web app.

This package is for local stdio MCP clients that can run a command such as `npx careeright-mcp`. For ChatGPT custom connectors, use your deployed Careeright remote MCP URL: `https://careeright.vercel.app/mcp`.

## Requirements

- Node.js 20.10 or newer
- A reachable Careeright app, usually `https://careeright.vercel.app/`
- A user-owned MCP token from Careeright at `/dashboard/mcp-tools`

## Environment

```bash
CAREERIGHT_MCP_URL=https://careeright.vercel.app/mcp
CAREERIGHT_MCP_TOKEN=<token-from-dashboard-mcp-tools>
```

`CAREERIGHT_MCP_URL` is optional and defaults to `https://careeright.vercel.app/mcp`.

`CAREERIGHT_MCP_TOKEN` is required. It scopes all MCP writes to the user who created the token.

## MCP Client Config

For local development before publishing the package, build it and point your MCP client at the compiled bridge:

```bash
bun run --cwd packages/careeright-mcp build
```

```json
{
  "mcpServers": {
    "careeright": {
      "command": "node",
      "args": [
        "C:\\Users\\prath\\OneDrive\\Desktop\\study\\temp\\open-source\\habage\\packages\\careeright-mcp\\dist\\stdio-proxy.js"
      ],
      "env": {
        "CAREERIGHT_MCP_URL": "https://careeright.vercel.app/mcp",
        "CAREERIGHT_MCP_TOKEN": "<token-from-dashboard-mcp-tools>"
      }
    }
  }
}
```

After publishing, the same server can be configured through `npx`:

```json
{
  "mcpServers": {
    "careeright": {
      "command": "npx",
      "args": ["careeright-mcp"],
      "env": {
        "CAREERIGHT_MCP_URL": "https://careeright.vercel.app/mcp",
        "CAREERIGHT_MCP_TOKEN": "<token-from-dashboard-mcp-tools>"
      }
    }
  }
}
```

On native Windows, some clients need the command wrapped as `cmd /c npx -y careeright-mcp` instead of calling `npx` directly.

## Publishing

```bash
npm login
bun run --cwd packages/careeright-mcp build
cd packages/careeright-mcp
npm pack --dry-run
npm publish
```

## Recommended Proposal Flow

1. Call `prepare_task_breakdown_prompt` for weak or unclear prompts.
2. Ask the returned clarification questions when needed.
3. Generate the proposal tasks in the AI client.
4. Submit them with `propose_task_breakdown_from_tasks`.
5. Review the proposal in Careeright and add selected tasks to Todo on demand.
