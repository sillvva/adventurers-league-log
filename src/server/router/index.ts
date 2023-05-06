// src/server/router/index.ts
import superjson from "superjson";
import { createRouter } from "./context";

import { charactersRouter } from "./routers/characters";
import { protectedCharactersRouter } from "./routers/_characters";
import { protectedDMsRouter } from "./routers/_dms";
import { protectedLogsRouter } from "./routers/_logs";

export const appRouter = createRouter()
	.transformer(superjson)
	.merge("characters.", charactersRouter)
	.merge("_characters.", protectedCharactersRouter)
	.merge("_logs.", protectedLogsRouter)
	.merge("_dms.", protectedDMsRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
