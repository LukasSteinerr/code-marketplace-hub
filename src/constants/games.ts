export const GAME_TITLES = [
  "Call of Duty: Modern Warfare",
  "Red Dead Redemption 2",
  "Grand Theft Auto V",
  "The Legend of Zelda: Breath of the Wild",
  "FIFA 24",
  "Minecraft",
  "Cyberpunk 2077",
  "Assassin's Creed Valhalla",
  "God of War Ragnarök",
  "Elden Ring",
  "Spider-Man 2",
  "Super Mario Odyssey",
  "The Last of Us Part II",
  "Horizon Forbidden West",
  "Resident Evil 4 Remake"
] as const;

export type GameTitle = (typeof GAME_TITLES)[number];