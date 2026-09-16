/* Lightweight game list for the terminal and command palette. The games themselves
   (src/arcade/games) are code-split and only load when the arcade opens. */

export type GameInfo = { id: string; title: string; tagline: string };

/** menu order; the index + 1 is the quick-launch key */
export const CATALOG: GameInfo[] = [
  { id: 'snake', title: 'SNAKE', tagline: 'Eat, grow, speed up. Grab the golden stars before they vanish.' },
  { id: 'tetris', title: 'TETRIS', tagline: 'SRS rotation, 7-bag, ghost, hold, T-spins and back-to-back.' },
  { id: 'breakout', title: 'BREAKOUT', tagline: 'Five stages, armored bricks, lasers and multiball. Combos multiply.' },
  { id: 'invaders', title: 'INVADERS', tagline: 'Hold the line. Destructible bunkers, mystery ships, faster waves.' },
  { id: 'asteroids', title: 'ASTEROIDS', tagline: 'Vector wrap-around chaos. Saucers hunt you; hyperspace is a gamble.' },
  { id: 'pong', title: 'PONG', tagline: 'First to 7 against a CPU that reads angles and sharpens when you lead.' },
  { id: 'flappy', title: 'FLAPPY', tagline: 'The FlappyMatrix bird escapes its 8×8 LED grid. Gaps shrink, speed climbs.' },
  { id: '2048', title: '2048', tagline: 'Slide, merge, chase the big tile. Smooth animations and swipe support.' },
  { id: 'minesweeper', title: 'MINES', tagline: '16×16, 40 mines. Chording, safe first click, long-press to flag on touch.' },
];

export const GAME_IDS = CATALOG.map((g) => g.id);

export const info = (id: string) => CATALOG.find((g) => g.id === id)!;

const ALIASES: Record<string, string> = {
  mines: 'minesweeper', sweeper: 'minesweeper', space: 'invaders', spaceinvaders: 'invaders',
  flappybird: 'flappy', bird: 'flappy', rocks: 'asteroids', bricks: 'breakout', arkanoid: 'breakout',
};

/** accepts ids, titles and a few friendly aliases ("mines", "space", "flappybird"…) */
export function findGameId(name: string): string | undefined {
  const q = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = ALIASES[q] ?? q;
  return CATALOG.find((g) => g.id === id || g.title.toLowerCase() === id)?.id;
}
