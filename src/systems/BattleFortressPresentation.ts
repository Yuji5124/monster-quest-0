import type { FortressRoom, FortressRoomKind } from "./BattleFortressGenerator.ts";

/** Renderer-facing palette only. Route generation and collision stay in BattleFortressGenerator. */
export interface BattleFortressRoomPresentation {
  readonly floor: number;
  readonly floorInset: number;
  readonly wall: number;
  readonly wallInset: number;
  readonly accent: number;
  readonly torch: number;
  readonly banner: number;
  readonly poison: boolean;
  readonly bossTerritory: boolean;
}

const PRESENTATIONS: Readonly<Record<"normal" | "unstable" | "direct" | "boss", BattleFortressRoomPresentation>> = {
  normal: {
    floor: 0x27282e, floorInset: 0x1b1d23, wall: 0x484851, wallInset: 0x25262d,
    accent: 0x8c7a65, torch: 0xffa344, banner: 0x7f2630, poison: false, bossTerritory: false,
  },
  unstable: {
    floor: 0x252a2d, floorInset: 0x172124, wall: 0x455156, wallInset: 0x203037,
    accent: 0x5fdca5, torch: 0x8ad7c2, banner: 0x456a68, poison: true, bossTerritory: false,
  },
  direct: {
    floor: 0x30262a, floorInset: 0x23171c, wall: 0x54424a, wallInset: 0x2b2027,
    accent: 0xce7650, torch: 0xee713d, banner: 0x8e2932, poison: false, bossTerritory: true,
  },
  boss: {
    floor: 0x392329, floorInset: 0x24151b, wall: 0x62444d, wallInset: 0x311f28,
    accent: 0x7ee891, torch: 0xff613e, banner: 0xa52b36, poison: true, bossTerritory: true,
  },
};

function kindForPresentation(room: Pick<FortressRoom, "kind"> | undefined): keyof typeof PRESENTATIONS {
  const kind: FortressRoomKind | undefined = room?.kind;
  if (kind === "boss" || kind === "boss-gate") return "boss";
  if (kind === "direct") return "direct";
  if (kind === "assembly" || kind === "misprint" || kind === "reconfigure" || kind === "checkpoint") return "unstable";
  return "normal";
}

/** Resolves a small, consistent palette for one room; safe for corridor tiles with no owning room. */
export function getBattleFortressRoomPresentation(
  room: Pick<FortressRoom, "kind"> | undefined,
): BattleFortressRoomPresentation {
  return PRESENTATIONS[kindForPresentation(room)];
}

/** The three authored special rooms must remain visible in every generated fortress. */
export function isBattleFortressSpecialRoom(kind: FortressRoomKind): boolean {
  return kind === "assembly" || kind === "misprint" || kind === "reconfigure";
}
