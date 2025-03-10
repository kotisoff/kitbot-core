import { ColorResolvable, EmbedBuilder } from "discord.js";
import ModuleConfig from "../Utils/CoreConfig";

const Config = new ModuleConfig<{
  footer: { text: string; evalAppend: string };
}>("CommandEmbed", {
  footer: {
    text: "Bot footer (modify config in configs/core) ",
    evalAppend: '"2024-"+new Date().getFullYear()'
  }
});

const config = {
  get footer() {
    return Config.config.footer.text + eval(Config.config.footer.evalAppend);
  }
};

type EmbedOptions = {
  title?: string;
  content?: string;
  color?: ColorResolvable;
  image?: string;
};

export default class CommandEmbed {
  static embed(options: EmbedOptions) {
    return new EmbedBuilder()
      .setColor(options.color ?? null)
      .setTitle(options.title ?? null)
      .setDescription(options.content ?? null)
      .setImage(options.image ?? null)
      .setTimestamp()
      .setFooter({
        text: config.footer
      });
  }

  static blankEmbed() {
    return this.embed({});
  }

  private static embedcolored(
    options: EmbedOptions | string,
    defaultColor: ColorResolvable | null
  ) {
    options = typeof options == "string" ? { content: options } : options;
    return this.embed(options).setColor(options.color ?? defaultColor);
  }

  static error(options: EmbedOptions | string) {
    return this.embedcolored(options, 0xff0000);
  }
  static warn(options: EmbedOptions | string) {
    return this.embedcolored(options, 0xffff00);
  }
  static success(options: EmbedOptions | string) {
    return this.embedcolored(options, 0x00ff00);
  }
  static info(options: EmbedOptions | string) {
    return this.embedcolored(options, 0x0000ff);
  }
}
