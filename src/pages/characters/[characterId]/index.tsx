import type { NextPageWithLayout } from "$src/pages/_app";
import Head from "next/head";
import { z } from "zod";
import { trpc } from "$src/utils/trpc";
import { useQueryString } from "$src/utils/hooks";

const Characters: NextPageWithLayout = () => {
  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  const { data: character } = trpc.useQuery(["characters.getOne", { id: params.characterId }], {
    ssr: true,
    refetchOnWindowFocus: false
  });

  if (!character) return null;

  return (
    <>
      <Head>
        <title>{character.name}</title>
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <pre>{JSON.stringify(character, null, 2)}</pre>
      </main>
    </>
  );
};

Characters.getLayout = page => {
  return page;
};

export default Characters;
