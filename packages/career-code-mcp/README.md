# career-code-mcp

`career-code-mcp` is a stdio MCP bridge for Career Code. It lets local AI clients such as Claude Desktop, Claude Code-style tools, Codex, and Gemini-compatible MCP clients talk to your signed-in Career Code workspace through the app's authenticated `/mcp` endpoint.

The package does not connect to MongoDB and does not create board tasks directly. Career Code keeps auth, proposal review, task creation, and user ownership inside the web app.

This package is for local stdio MCP clients that can run a command such as `npx career-code-mcp`. For ChatGPT custom connectors, use your deployed Career Code remote MCP URL: `https://career-code.vercel.app/mcp`.

## Requirements

- Node.js 20.10 or newer
- A reachable Career Code app, usually `https://career-code.vercel.app/`
- A user-owned MCP token from Career Code at `/dashboard/mcp-tools`

## Environment

```bash
CAREER_CODE_MCP_URL=https://career-code.vercel.app/mcp
CAREER_CODE_MCP_TOKEN=<token-from-dashboard-mcp-tools>
```

`CAREER_CODE_MCP_URL` is optional and defaults to `https://career-code.vercel.app/mcp`.

`CAREER_CODE_MCP_TOKEN` is required. It scopes all MCP writes to the user who created the token.

## MCP Client Config

For local development before publishing the package, build it and point your MCP client at the compiled bridge:

```bash
bun run --cwd packages/career-code-mcp build
```

```json
{
  "mcpServers": {
    "career-code": {
      "command": "node",
      "args": [
        "C:\\Users\\prath\\OneDrive\\Desktop\\study\\temp\\open-source\\habage\\packages\\career-code-mcp\\dist\\stdio-proxy.js"
      ],
      "env": {
        "CAREER_CODE_MCP_URL": "https://career-code.vercel.app/mcp",
        "CAREER_CODE_MCP_TOKEN": "<token-from-dashboard-mcp-tools>"
      }
    }
  }
}
```

After publishing, the same server can be configured through `npx`:

```json
{
  "mcpServers": {
    "career-code": {
      "command": "npx",
      "args": ["career-code-mcp"],
      "env": {
        "CAREER_CODE_MCP_URL": "https://career-code.vercel.app/mcp",
        "CAREER_CODE_MCP_TOKEN": "<token-from-dashboard-mcp-tools>"
      }
    }
  }
}
```

On native Windows, some clients need the command wrapped as `cmd /c npx -y career-code-mcp` instead of calling `npx` directly.

## Publishing

```bash
npm login
bun run --cwd packages/career-code-mcp build
cd packages/career-code-mcp
npm pack --dry-run
npm publish
```

## Recommended Proposal Flow

1. Call `prepare_task_breakdown_prompt` for weak or unclear prompts.
2. Ask the returned clarification questions when needed.
3. Generate the proposal tasks in the AI client.
4. Submit them with `propose_task_breakdown_from_tasks`.
5. Review the proposal in Career Code and add selected tasks to Todo on demand.
