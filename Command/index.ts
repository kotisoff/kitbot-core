import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  CommandInteraction,
  Message,
  SlashCommandBuilder
} from "discord.js";
import fs from "fs";
import path from "path";
import PrefixCommandBuilder from "./PrefixCommandBuilder";
import Logger from "../Logger";
import CommandOptions from "./CommandOptions";
import CustomClient from "../CustomClient";

export default abstract class Command {
  /** Defines after which commands this command will be initialized. */
  dependencies: string[] = [];

  /** Identifier and trigger of command */
  id: string;
  /** Command name (console logger name) */
  name: string;
  /** Command description (for help command and etc) */
  get description() {
    return this.slashCommandInfo.description;
  }
  /** Slash - Is slash command
   * Prefix - Is prefix command
   * Global - Can you use this command in other servers */
  type: { slash: boolean; prefix: boolean; global: boolean };
  /** Path to command file */
  path?: string;

  slashCommandInfo: SlashCommandBuilder;
  prefixCommandInfo: PrefixCommandBuilder;

  // Configuration and data
  private configFolder: string;
  private configName: string;
  private dataFolder: string;

  // Logger
  logger: Logger;

  // User permissions
  private users: string[] | undefined;

  constructor(options: CommandOptions) {
    this.id = options.id;
    this.name = options.name;
    this.type = options.type;

    // Command Builders
    this.slashCommandInfo = new SlashCommandBuilder().setName(this.id).setDescription(this.name);

    this.prefixCommandInfo = new PrefixCommandBuilder().addAlias(this.id);

    // Config and data.
    this.configFolder = this.id;
    this.configName = "index";
    this.dataFolder = this.id;

    // Logger
    this.logger = new Logger(this.name);
  }

  setDescription(description: string) {
    this.slashCommandInfo.setDescription(description);
  }

  runSlash?(interaction: CommandInteraction, client: CustomClient): Promise<any>;

  runPrefix?(message: Message, args: string[], client: CustomClient): Promise<any>;

  /**
   * @param message WARNING! This parameter could be interaction or message.
   * Try to use only methods, which are in both classes.
   */
  run?(message: Message | CommandInteraction, args: string[], client: CustomClient): Promise<any>;

  async onInit(client: CustomClient): Promise<void> {}

  async shutdown(): Promise<void> {}

  async autocomplete(interaction: AutocompleteInteraction, client: CustomClient): Promise<void> {}

  // Config

  setConfigName(configName: string): void {
    this.configName = configName;
  }

  setConfigFolder(configFolder: string): void {
    this.configFolder = configFolder;
  }

  readConfig<config = any>(configName = this.configName): config | undefined {
    const cfg = path.join(this.getCfgDir(), configName + ".json");
    try {
      return JSON.parse(fs.readFileSync(cfg, { encoding: "utf-8" }));
    } catch {
      return;
    }
  }

  writeConfig<config = any>(data: config, configName = this.configName): config {
    const dir = this.getCfgDir();
    const cfg = path.join(dir, configName, ".json");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cfg, JSON.stringify(data));
    return data;
  }

  deleteConfig() {
    const cfg = path.join(this.getCfgDir());
    if (!fs.existsSync(cfg)) return false;
    fs.rmSync(cfg, { force: true });
    return true;
  }

  private getCfgDir = () => path.join(process.cwd(), "configs/commands", this.configFolder);

  // Data

  setDataFolder(name: string): void {
    this.dataFolder = name;
  }

  readData<data = any>(dataFilename = "index"): data | undefined {
    const file = path.join(this.getDataDir(), dataFilename + ".json");
    try {
      return JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));
    } catch {
      return;
    }
  }

  writeData<data = any>(data: data, filepath = "index"): data {
    const file = path.join(this.getDataDir(), filepath + ".json");
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    return data;
  }

  getDataDir() {
    const dataDir = this.getDataDirPath();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return dataDir;
  }

  private getDataDirPath = () => {
    return path.join(process.cwd(), "data", this.dataFolder);
  };

  /**
   * Set users who can use that command. If not set, everyone can use.
   */
  setUsers(...ids: string[]) {
    this.users = ids;
    return this;
  }

  /**
   * Push users into users array.
   */
  pushUsers(...ids: string[]) {
    this.users = this.users ? [...this.users, ...ids] : ids;
    return this;
  }

  /**
   * Get users who can use that command.
   */
  getUsers() {
    return this.users;
  }

  static interactionToArgs(interaction: CommandInteraction) {
    const args = interaction.options.data
      .filter(
        (a) =>
          a.type ==
          (ApplicationCommandOptionType.String ||
            ApplicationCommandOptionType.Number ||
            ApplicationCommandOptionType.Boolean ||
            ApplicationCommandOptionType.Integer)
      )
      .map((v) => v.value?.toString()) as string[];

    args.push(
      ...interaction.options.data
        .filter((a) => a.type == ApplicationCommandOptionType.Channel)
        .map((v) => v.channel?.id as string)
    );

    args.push(
      ...interaction.options.data
        .filter((a) => a.type == ApplicationCommandOptionType.User)
        .map((v) => v.user?.id as string)
    );

    return args;
  }

  static getCommandByClass<CommandType = Command>(client: CustomClient, Class: Command): CommandType {
    const commands = client.prefCmd.concat(client.interCmd);
    return commands.find((v) => v.constructor.name == Class.constructor.name) as CommandType;
  }
}
