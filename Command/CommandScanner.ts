import "colors";
import Command from ".";
import Config from "../Config";
import { scanDirectory } from "../Utils/scannerUtils";
import Logger from "../Logger";
import { basename } from "discord.js";

const args = process.argv.slice(2);

export default class CommandScanner {
  config: Config;
  commands: Command[] = [];
  logger = new Logger("CommandScanner");

  constructor(config: Config) {
    this.config = config;
  }

  private sortByDependencies() {
    const sorted: Command[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const map = new Map<string, Command>();
    for (const cmd of this.commands) {
      if (map.has(cmd.id)) {
        throw new Error(`ID duplicate: "${cmd.id}" ${cmd.path}`);
      }
      map.set(cmd.id, cmd);
    }

    function visit(cmd: Command) {
      if (visited.has(cmd.id)) return;
      if (temp.has(cmd.id)) {
        throw new Error(`Cycled dependencies: "${cmd.id}" ${cmd.path}`);
      }

      temp.add(cmd.id);
      for (const dep of cmd.dependencies) {
        const depCmd = map.get(dep);
        if (!depCmd) {
          throw new Error(`Dependency "${dep}" not found for "${cmd.id}" ${cmd.path}`);
        }
        visit(depCmd);
      }
      temp.delete(cmd.id);
      visited.add(cmd.id);
      sorted.push(cmd);
    }

    for (const cmd of this.commands) {
      visit(cmd);
    }

    this.commands = sorted;
  }

  importCommands(extensionFilters = ["js", "ts"]) {
    const files = scanDirectory(this.config.settings.commandPath, {
      ignoreFilters: this.config.settings.ignoredCommandDirs,
      extensionFilters
    });
    this.commands = files
      .map((file) => {
        try {
          const imported = require(file);
          const CommandClass = imported?.default;
          if (typeof CommandClass !== "function") {
            throw new Error(`File ${file} does not export class by default`);
          }
          const command = new CommandClass() as Command;

          if (!command.id) return;
          command.path = file;
          return command;
        } catch (error) {
          this.logger.error(
            `Error loading ${basename(file)}`.red,
            args.includes("--errdetails") ? error : "--errdetails to get detailed error".gray
          );
          this.logger.info("Skipping...".magenta);
        }
      })
      .filter((v) => v) as Command[];

    this.sortByDependencies();

    return this.commands;
  }
}
