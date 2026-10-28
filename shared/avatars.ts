export interface AvatarDefinition {
  id: string;
  name: string;
  background: string;
  icon: string;
}

export const AVATARS: AvatarDefinition[] = [
  { id: "ghost", name: "Ghost", background: "#D9FF43", icon: "ghost" },
  { id: "eye", name: "Eye", background: "#5B5BFF", icon: "eye" },
  { id: "bolt", name: "Bolt", background: "#FF6B4A", icon: "bolt" },
  { id: "cherry", name: "Cherry", background: "#FFC9D8", icon: "cherry" },
  { id: "dice", name: "Dice", background: "#F3EFE3", icon: "dice" },
  { id: "skull", name: "Skull", background: "#BFA7FF", icon: "skull" },
  { id: "alien", name: "Alien", background: "#9DF2D4", icon: "alien" },
  { id: "crown", name: "Crown", background: "#FFD86B", icon: "crown" },
  { id: "flower", name: "Flower", background: "#FF9D7A", icon: "flower" },
  { id: "wave", name: "Wave", background: "#8CD8FF", icon: "wave" },
  { id: "heart", name: "Heart", background: "#FF8FA3", icon: "heart" },
  { id: "star", name: "Star", background: "#E8FF8F", icon: "star" },
];

export function avatarFor(index: number): AvatarDefinition {
  return AVATARS[Math.max(0, Math.min(AVATARS.length - 1, index))] ?? AVATARS[0];
}

export function isValidAvatar(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < AVATARS.length;
}
