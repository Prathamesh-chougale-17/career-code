import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";
import { deleteUserScopedData } from "@careeright/domain/kanban/store";

const targetUserId = process.argv[2]?.trim() || SOLO_USER_ID;

if (targetUserId !== SOLO_USER_ID && !process.argv.includes("--force")) {
  throw new Error(
    `Refusing to delete "${targetUserId}" without --force. This script is intended for ${SOLO_USER_ID}.`,
  );
}

const counts = await deleteUserScopedData(targetUserId);

console.log(`Deleted Careeright data for ${targetUserId}:`);
for (const [collection, count] of Object.entries(counts)) {
  console.log(`- ${collection}: ${count}`);
}
