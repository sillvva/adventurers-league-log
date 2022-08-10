// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { charactersRouter as charactersRouter } from "./routers/characters";
import { protectedCharactersRouter } from "./routers/_characters";
import { protectedGamesRouter } from "./routers/_games";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("characters.", charactersRouter)
  .merge("_characters.", protectedCharactersRouter)
  .merge("_games.", protectedGamesRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
