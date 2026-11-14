import { jidNormalizedUser, type GroupMetadata, type WASocket } from "baileys";
import { groupCaches } from "@core/session";

const norm = (j?: string | null) => (j ? jidNormalizedUser(j) : "");

export const botIds = (sock: WASocket) =>
  [sock.user?.id, (sock.user as { lid?: string } | undefined)?.lid]
    .map(norm)
    .filter(Boolean);

export function findParticipant(meta: GroupMetadata, ids: string[]) {
  const wanted = new Set(ids.map(norm).filter(Boolean));
  return meta.participants.find((p) =>
    [p.id, p.phoneNumber, p.lid].some((x) => wanted.has(norm(x))),
  );
}
export const isAdmin = (p?: { admin?: string | null }) =>
  p?.admin === "admin" || p?.admin === "superadmin";

export async function getGroupMetadata(
  sock: WASocket,
  jid: string,
): Promise<GroupMetadata> {
  const cache = groupCaches.get(sock);
  const hit = cache?.get<GroupMetadata>(jid);
  if (hit) return hit;
  const meta = await sock.groupMetadata(jid);
  cache?.set(jid, meta);
  return meta;
}
