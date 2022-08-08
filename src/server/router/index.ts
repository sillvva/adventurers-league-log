// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { charactersRouter as charactersRouter } from "./routers/characters";
import { protectedCharactersRouter } from "./routers/protected-characters";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("characters.", charactersRouter)
  .merge("_characters.", protectedCharactersRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
