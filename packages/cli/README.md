# @tupper/cli

Command-line interface for [Tupper](../../README.md) sandboxes, built on [commander](https://github.com/tj/commander.js). A thin wrapper over [`@tupper/sdk`](../sdk).

## Install

```bash
npm install -g @tupper/cli
# or run ad-hoc
npx @tupper/cli --help
```

## Commands

```bash
tupper create [image]              # create a sandbox, prints its id
tupper list                        # list sandboxes (alias: ls)
tupper info <id>                   # show status and metadata
tupper run <id> <command...>       # run a command, exits with its exit code
tupper read <id> <path>            # read a file to stdout
tupper write <id> <path>           # write a file (from --content or stdin)
tupper kill <id>                   # stop and remove a sandbox (alias: rm)
```

Examples:

```bash
ID=$(tupper create docker.io/library/alpine:latest)
tupper run "$ID" cat /etc/os-release
echo "hello" | tupper write "$ID" /tmp/hi.txt
tupper run "$ID" cat /tmp/hi.txt
tupper kill "$ID"
```

Common flags: `--backend <name>` forces a backend (otherwise the platform default is auto-selected); `create` also takes `--name`, `--cpus`, `--memory`, `-e/--env KEY=VALUE` (repeatable), and `--timeout <ms>`.

## Programmatic use

```ts
import { makeProgram } from "@tupper/cli";

await makeProgram().parseAsync(process.argv);
```
