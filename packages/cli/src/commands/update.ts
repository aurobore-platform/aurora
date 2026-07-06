import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  generateEd25519KeyPair,
  listOtaVersions,
  loadConfig,
  publishOtaBundle,
  rollbackOtaChannel,
  writeKeyPair,
} from "@aurobore/build";

import { flagBool, flagString, type ParsedArgs } from "../args.js";

function printUpdateHelp(): void {
  console.log(`aurobore update keygen|publish|list|rollback

  keygen [--out .ota/keys]     Сгенерировать Ed25519 keypair
  publish [--channel stable] [--private-key path] [--out .ota] [--bundle-version ver]
  list [--channel stable] [--out .ota]
  rollback --to <version> [--channel stable] [--out .ota]`);
}

export async function runUpdateCommand(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (flagBool(args.flags, "help") || !sub) {
    printUpdateHelp();
    return sub ? 0 : 1;
  }

  const projectRoot = process.cwd();

  try {
    switch (sub) {
      case "keygen": {
        const outDir = flagString(args.flags, "out") ?? path.join(projectRoot, ".ota", "keys");
        const pair = generateEd25519KeyPair();
        const paths = writeKeyPair(outDir, pair);
        console.log(`[update] public key: ${pair.publicKey}`);
        console.log(`[update] wrote ${paths.publicPath}`);
        console.log(`[update] wrote ${paths.privatePath}`);
        console.log("[update] add publicKey to aurobore.config updates section");
        return 0;
      }
      case "publish": {
        const { config } = loadConfig(projectRoot);
        const outDir = flagString(args.flags, "out") ?? path.join(projectRoot, ".ota");
        const channel = flagString(args.flags, "channel") ?? config.updates?.channel ?? "stable";
        const privateKeyPath =
          flagString(args.flags, "private-key") ??
          path.join(projectRoot, ".ota", "keys", "private.pem");
        if (!fs.existsSync(privateKeyPath)) {
          console.error(`[update] private key not found: ${privateKeyPath}`);
          console.error("[update] run `aurobore update keygen` first");
          return 1;
        }
        const result = await publishOtaBundle({
          projectRoot,
          config,
          outDir,
          channel,
          bundleVersion: flagString(args.flags, "bundle-version") ?? undefined,
          privateKeyPath,
          baseUrl: config.updates?.url,
          dryRun: flagBool(args.flags, "dry-run"),
        });
        if (flagBool(args.flags, "dry-run")) {
          console.log("[update] dry-run manifest:", JSON.stringify(result.manifest, null, 2));
          return 0;
        }
        console.log(`[update] published ${result.channel}/${result.bundleVersion}`);
        console.log(`[update] output: ${result.versionDir}`);
        console.log(`[update] manifestUrl: ${result.channelPointer.manifestUrl}`);
        return 0;
      }
      case "list": {
        const outDir = flagString(args.flags, "out") ?? path.join(projectRoot, ".ota");
        const channel = flagString(args.flags, "channel") ?? "stable";
        const versions = listOtaVersions({ outDir, channel });
        if (versions.length === 0) {
          console.log(`[update] no versions in ${path.join(outDir, channel)}`);
          return 0;
        }
        for (const version of versions) {
          console.log(version);
        }
        return 0;
      }
      case "rollback": {
        const toVersion = flagString(args.flags, "to") ?? args.positional[1];
        if (!toVersion) {
          console.error("[update] usage: aurobore update rollback --to <version>");
          return 1;
        }
        const { config } = loadConfig(projectRoot);
        const outDir = flagString(args.flags, "out") ?? path.join(projectRoot, ".ota");
        const channel = flagString(args.flags, "channel") ?? config.updates?.channel ?? "stable";
        const pointer = rollbackOtaChannel({
          outDir,
          channel,
          toVersion,
          baseUrl: config.updates?.url,
        });
        console.log(`[update] channel ${channel} → ${pointer.bundleVersion}`);
        return 0;
      }
      default:
        console.error(`[update] неизвестная подкоманда: ${sub}`);
        return 1;
    }
  } catch (err) {
    console.error(`[update] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
