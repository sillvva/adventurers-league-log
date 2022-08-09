import type { NextPageWithLayout } from "$src/pages/_app";
import { z } from "zod";
import { trpc } from "$src/utils/trpc";
import { useQueryString } from "$src/utils/hooks";
import { mdiDotsHorizontal, mdiHome } from "@mdi/js";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import Icon from "@mdi/react";
import { useRef } from "react";

const Characters: NextPageWithLayout = () => {
  const level = useRef(1);
  level.current = 1;

  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  const { data: character } = trpc.useQuery(["characters.getOne", { id: params.characterId }], {
    ssr: true,
    refetchOnWindowFocus: false
  });

  if (!character) return (
    <Head>
      <title>Character</title>
    </Head>
  );

  return (
    <>
      <Head>
        <title>{character.name}</title>
      </Head>

      <div className="flex gap-4">
        <div className="flex-1 text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <Icon path={mdiHome} className="w-4" />
            </li>
            <li>
              <Link href="/characters">
                <a className="text-neutral-content">Characters</a>
              </Link>
            </li>
            <li className="text-secondary">{character.name}</li>
          </ul>
        </div>
        <div className="dropdown dropdown-end">
          <label tabIndex={1} className="btn btn-sm">
            <Icon path={mdiDotsHorizontal} size={1} />
          </label>
          <ul tabIndex={1} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
            <li>
              <Link href={`/characters/${params.characterId}/edit`}>
                <a>Edit</a>
              </Link>
            </li>
            <li>
              <a>Export</a>
            </li>
            <li>
              <a className="bg-red-600 text-white">Delete</a>
            </li>
          </ul>
        </div>
      </div>

      <section className="flex">
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col">
            <h3 className="flex-1 text-4xl font-vecna text-primary-content font-bold">{character.name}</h3>
            <p className="flex-1 text-sm text-neutral-content font-semibold">
              {character.race} {character.class}
            </p>
            <p className="flex-1 text-xs text-neutral-content">
              {character.campaign}
              {character.character_sheet_url && (
                <>
                  {" "}
                  -{" "}
                  <a href={character.character_sheet_url} target="_blank" rel="noreferrer noopner" className="text-secondary font-semibold">
                    Character Sheet
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 basis-full sm:basis-1/2 lg:basis-1/3 flex flex-col gap-4">
              <div className="flex">
                <h4 className="font-semibold text-secondary-content">Level</h4>
                <div className="flex-1 text-right">{character.total_level}</div>
              </div>
              <div className="flex">
                <h4 className="font-semibold text-secondary-content">Tier</h4>
                <div className="flex-1 text-right">{character.tier}</div>
              </div>
              <div className="flex">
                <h4 className="font-semibold text-secondary-content">Gold</h4>
                <div className="flex-1 text-right">{character.total_gold.toLocaleString("en-US")}</div>
              </div>
            </div>
            <div className="flex-1 basis-full sm:basis-1/2 lg:basis-2/3 flex flex-col">
              <div className="flex flex-col gap-4">
                {character.story_awards.length > 0 && (
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-semibold text-secondary-content">Story Awards</h4>
                    <p>{character.story_awards.map(mi => mi.name).join(" | ")}</p>
                  </div>
                )}
                {character.magic_items.length > 0 && (
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-semibold text-secondary-content">Magic Items</h4>
                    <p>{character.magic_items.map(mi => mi.name).join(" | ")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {character.image_url && (
          <div className="relative w-56 h-96 hidden md:block">
            <a href={character.image_url} target="_blank" rel="noreferrer noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.image_url} className="object-contain object-top" alt={character.name} />
            </a>
          </div>
        )}
      </section>
      <section>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Advancement</th>
                <th>Treasure</th>
              </tr>
            </thead>
            <tbody>
              {character.games.map(game => {
                const level_gained = character.game_levels.includes(game.id) ? 1 : 0;
                level.current += level_gained;

                return (
                  <tr key={game.id}>
                    <td className="align-top">
                      <p className="text-primary-content font-semibold">{game.name}</p>
                      <p className="text-sm text-neutral-content">DM: {game.dm.name}</p>
                      <p className="text-xs text-neutral-content">{game.description}</p>
                    </td>
                    <td className="align-top">
                      {game.experience > 0 && (
                        <p>
                          <span className="font-semibold">Experience:</span> {game.experience}
                        </p>
                      )}
                      {game.acp > 0 && (
                        <p>
                          <span className="font-semibold">ACP:</span> {game.acp}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Level:</span> {level_gained} {`(${level.current})`}
                      </p>
                    </td>
                    <td className="align-top">
                      {game.tcp > 0 && (
                        <p>
                          <span className="font-semibold">TCP:</span> {game.tcp}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Gold:</span> {game.gold.toLocaleString("en-US")}
                      </p>
                      <p>
                        <span className="font-semibold">Magic Items:</span>
                        <br />
                        {game.magic_items_gained.map(mi => mi.name).join(" | ")}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

Characters.getLayout = page => {
  return <Layout>{page}</Layout>;
};

export default Characters;
