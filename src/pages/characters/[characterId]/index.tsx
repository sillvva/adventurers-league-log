import type { NextPageWithLayout } from "$src/pages/_app";
import { z } from "zod";
import { trpc } from "$src/utils/trpc";
import { useQueryString } from "$src/utils/hooks";
import { mdiHome } from "@mdi/js";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import Icon from "@mdi/react";

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

      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li><Icon path={mdiHome} className="w-4" /></li>
          <li>
            <Link href="/characters">
              <a className="text-neutral-content">Characters</a>
            </Link>
          </li>
          <li className="text-secondary">{character.name}</li>
        </ul>
      </div>

      <main className="container mx-auto flex justify-center p-4">
        <pre>{JSON.stringify(character, null, 2)}</pre>
      </main>
    </>
  );
};

Characters.getLayout = page => {
  return <Layout>{page}</Layout>;
};

export default Characters;
