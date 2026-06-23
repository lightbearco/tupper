# @tupper/mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for [Tupper](../../README.md) sandboxes. Exposes [`@tupper/sdk`](../sdk) to any MCP client (Claude Desktop, IDEs, agents) over stdio.

## Run

The server needs a sandbox **backend** installed alongside it — [`@tupper/container`](../container) on macOS, [`@tupper/firecracker`](../firecracker) on Linux. Install both in a single command with `npx -p` so the backend is present when the server resolves it:

```bash
# macOS
npx -y -p @tupper/mcp -p @tupper/container tupper-mcp

# Linux (experimental)
npx -y -p @tupper/mcp -p @tupper/firecracker tupper-mcp
```

Register it with an MCP client, e.g. Claude Desktop's `claude_desktop_config.json` or Cursor's `mcp.json` (on Linux, swap `@tupper/container` for `@tupper/firecracker`):

```json
{
  "mcpServers": {
    "tupper": {
      "command": "npx",
      "args": ["-y", "-p", "@tupper/mcp", "-p", "@tupper/container", "tupper-mcp"]
    }
  }
}
```

> Running just `npx @tupper/mcp` installs the server without a backend, so `create_sandbox` fails with *"No available sandbox backend"*. The `-p` flags install the backend in the same step.

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
