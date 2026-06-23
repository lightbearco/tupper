# @tupper/mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for [Tupper](../../README.md) sandboxes. Exposes [`@tupper/sdk`](../sdk) to any MCP client (Claude Desktop, IDEs, agents) over stdio.

## Run

```bash
npx @tupper/mcp
```

The platform sandbox **backend** is installed automatically — [`@tupper/container`](../container) on macOS, [`@tupper/firecracker`](../firecracker) on Linux (an optional dependency, selected by your OS).

Register it with an MCP client, e.g. Claude Desktop's `claude_desktop_config.json` or Cursor's `mcp.json`:

```json
{
  "mcpServers": {
    "tupper": {
      "command": "npx",
      "args": ["-y", "@tupper/mcp"]
    }
  }
}
```

> If your installer skips optional dependencies (e.g. `--omit=optional`), install a backend explicitly: `npm i @tupper/container` (macOS) or `@tupper/firecracker` (Linux).

## Tools

| Tool | Arguments | Description |
| --- | --- | --- |
| `create_sandbox` | `image?`, `backend?` | Create a sandbox; returns its id and info. |
| `list_sandboxes` | `backend?` | List sandboxes. |
| `run_command` | `id`, `command`, `backend?` | Run a shell command; returns exit code + output. |
| `read_file` | `id`, `path`, `backend?` | Read a UTF-8 file. |
| `write_file` | `id`, `path`, `content`, `backend?` | Write a UTF-8 file. |
| `kill_sandbox` | `id`, `backend?` | Stop and remove a sandbox. |

Omit `backend` to auto-select the platform default.

## Embed

`createServer()` returns a configured `McpServer` you can connect to any transport:

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "@tupper/mcp";

await createServer().connect(new StdioServerTransport());
```
