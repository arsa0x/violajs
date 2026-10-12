export type BotConfig = {
  prefix: string;
  owners: Set<string>;
  downloaderApiBaseUrl?: string;
  downloaderApiKey?: string;
};
