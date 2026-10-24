export type BotConfig = {
  prefix: string;
  owners: Set<string>;

  // nekopoi (optional)
  nekopoi_base?: string; // nekopoi_base
  nekopoi_paths?: string; // nekopoi_paths
  nekopoi_build_code?: string; // nekopoi_build_code
  nekopoi_signature?: string; // nekopoi_signature
  nekopoi_user_agent?: string; // nekopoi_user_agent
  nekopoi_token?: string; // nekopoi_token
};
