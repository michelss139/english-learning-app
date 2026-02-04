const AVATAR_COUNT = 9;

export const DEFAULT_AVATARS = Array.from({ length: AVATAR_COUNT }, (_, idx) => {
  const id = String(idx + 1).padStart(2, "0");
  return `/avatars/avatar${id}.png`;
});

export function getRandomAvatar() {
  const idx = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[idx];
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickAvatarForSeed(seed?: string | null) {
  if (!seed) return DEFAULT_AVATARS[0];
  const idx = hashSeed(seed) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[idx];
}

export function resolveAvatarUrl(avatarUrl?: string | null, seed?: string | null) {
  if (avatarUrl?.startsWith("/avatars/avatar-")) {
    return avatarUrl.replace("/avatars/avatar-", "/avatars/avatar");
  }
  return avatarUrl || pickAvatarForSeed(seed);
}
