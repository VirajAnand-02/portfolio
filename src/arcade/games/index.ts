import type { GameDef } from '../core';
import { CATALOG, findGameId } from '../catalog';
import { snake } from './snake';
import { tetris } from './tetris';
import { breakout } from './breakout';
import { invaders } from './invaders';
import { asteroids } from './asteroids';
import { pong } from './pong';
import { flappy } from './flappy';
import { g2048 } from './g2048';
import { minesweeper } from './minesweeper';

const DEFS = [snake, tetris, breakout, invaders, asteroids, pong, flappy, g2048, minesweeper];

/** same order as the catalog */
export const GAMES: GameDef[] = CATALOG.map((c) => DEFS.find((d) => d.id === c.id)!);

export function findGame(name: string): GameDef | undefined {
  const id = findGameId(name);
  return GAMES.find((g) => g.id === id);
}
