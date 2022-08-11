import type { NextPageWithLayout } from "$src/pages/_app";
import { z } from "zod";
import { trpc } from "$src/utils/trpc";
import { useQueryString } from "$src/utils/hooks";
import { mdiDotsHorizontal, mdiHome, mdiPencil, mdiTrashCan } from "@mdi/js";
import Head from "next/head";
import Link from "next/link";
import Layout from "$src/layouts/main";
import Icon from "@mdi/react";
import { Fragment, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { slugify } from "$src/utils/misc";

const Characters: NextPageWithLayout = () => {
  const session = useSession();
  const router = useRouter();
  const level = useRef(1);
  level.current = 1;

  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  const { data: character } = trpc.useQuery(["characters.getOne", { characterId: params.characterId }], {
    ssr: true,
    refetchOnWindowFocus: false
  });

  const utils = trpc.useContext();
  const deleteGameMutation = trpc.useMutation(["_logs.delete"], {
    onSuccess() {
      utils.invalidateQueries(["characters.getOne", { characterId: params.characterId }]);
    }
  });

  const deleteCharacterMutation = trpc.useMutation(["_characters.delete"], {
    onSuccess() {
      router.replace("/characters");
    }
  });

  if (!character)
    return (
      <Head>
        <title>Character</title>
      </Head>
    );

  return (
    <>
      <Head>
        <title>{character.name}</title>
      </Head>

      <div className="flex gap-4 print:hidden">
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
        {session.data?.user && (
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
                <a download={`${slugify(character.name)}.json`} href={`/api/exports/characters/${params.characterId}`} target="_blank" rel="noreferrer noopener">
                  Export
                </a>
              </li>
              <li>
                <a
                  className="bg-red-600 text-white"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this character? This action cannot be undone.")) {
                      deleteCharacterMutation.mutate({ id: params.characterId });
                    }
                  }}>
                  Delete
                </a>
              </li>
            </ul>
          </div>
        )}
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
          <div className="flex-1 flex flex-wrap sm:flex-nowrap print:flex-nowrap gap-6">
            <div className="flex-1 basis-full sm:basis-1/2 lg:basis-1/3 print:basis-1/3 flex flex-col gap-4">
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
            <div className="flex-1 basis-full sm:basis-1/2 lg:basis-2/3 print:basis-2/3 flex flex-col">
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
          <div className="flex gap-4 print:hidden">
            {session.data?.user && (
              <Link href={`/characters/${params.characterId}/game/new`}>
                <a className="btn btn-primary btn-sm">New Log</a>
              </Link>
            )}
          </div>
        </div>
        {character.image_url && (
          <div className="relative w-56 max-h-80 hidden md:flex print:flex flex-col justify-center items-end">
            <a href={character.image_url} target="_blank" rel="noreferrer noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.image_url} className="object-contain object-top max-h-80" alt={character.name} />
            </a>
          </div>
        )}
      </section>
      <section className="mt-6">
        <div className="overflow-x-auto rounded-lg">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="table-cell sm:hidden print:hidden">Game</th>
                <th className="hidden sm:table-cell print:table-cell">Title</th>
                <th className="hidden sm:table-cell print:table-cell">Advancement</th>
                <th className="hidden sm:table-cell print:table-cell">Treasure</th>
                <th className="hidden sm:table-cell print:!hidden">Story Awards</th>
                <th className="print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {character.logs.map(log => {
                const level_gained = character.log_levels.find(gl => gl.id === log.id);
                if (level_gained) level.current += level_gained.levels;

                return (
                  <Fragment key={log.id}>
                    <tr>
                      <th className="align-top">
                        <p className="text-primary-content font-semibold">{log.name}</p>
                        {log.dm && (
                          <p className="text-sm text-neutral-content font-normal">
                            <span className="font-semibold">DM:</span> {log.dm.name}
                          </p>
                        )}
                        <div className="table-cell sm:hidden print:hidden font-normal">
                          {log.experience > 0 && (
                            <p>
                              <span className="font-semibold">Experience:</span> {log.experience}
                            </p>
                          )}
                          {log.acp > 0 && (
                            <p>
                              <span className="font-semibold">ACP:</span> {log.acp}
                            </p>
                          )}
                          <p>
                            <span className="font-semibold">Levels:</span> {level_gained ? level_gained.levels : 0} {`(${level.current})`}
                          </p>
                          {log.tcp > 0 && (
                            <p>
                              <span className="font-semibold">TCP:</span> {log.tcp}
                            </p>
                          )}
                          <p>
                            <span className="font-semibold">Gold:</span> {log.gold.toLocaleString("en-US")}
                          </p>
                          <div>
                            <p className="font-semibold">Magic Items:</p>
                            <p className="text-sm">{log.magic_items_gained.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        </div>
                      </th>
                      <td className="align-top hidden sm:table-cell print:table-cell">
                        {log.experience > 0 && (
                          <p>
                            <span className="font-semibold">Experience:</span> {log.experience}
                          </p>
                        )}
                        {log.acp > 0 && (
                          <p>
                            <span className="font-semibold">ACP:</span> {log.acp}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Levels:</span> {level_gained ? level_gained.levels : 0} {`(${level.current})`}
                        </p>
                      </td>
                      <td className="align-top hidden sm:table-cell print:table-cell">
                        {log.tcp > 0 && (
                          <p>
                            <span className="font-semibold">TCP:</span> {log.tcp}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Gold:</span> {log.gold.toLocaleString("en-US")}
                        </p>
                        {(log.magic_items_gained.length > 0 || log.magic_items_lost.length > 0) && (
                          <div>
                            <p className="font-semibold">Magic Items:</p>
                            <p className="text-sm">{log.magic_items_gained.map(mi => mi.name).join(" | ")}</p>
                            <p className="text-sm line-through">{log.magic_items_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        )}
                      </td>
                      <td className="align-top hidden sm:table-cell print:!hidden">
                        {(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                          <div>
                            <p className="text-sm">{log.story_awards_gained.map(mi => mi.name).join(" | ")}</p>
                            <p className="text-sm line-through">{log.story_awards_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        )}
                      </td>
                      <td className="w-8 print:hidden">
                        <div className="flex flex-col justify-center gap-2">
                          <Link href={`/characters/${params.characterId}/game/${log.id}`}>
                            <a className="btn btn-sm btn-primary">
                              <Icon path={mdiPencil} size={0.8} />
                            </a>
                          </Link>
                          <button
                            className="btn btn-sm"
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete ${log.name}? This action cannot be reversed.`)) return false;
                              deleteGameMutation.mutate({ logId: log.id });
                            }}>
                            <Icon path={mdiTrashCan} size={0.8} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr className="hidden print:table-row">
                      <td colSpan={3}>
                        <p className="text-sm">
                          <span className="font-semibold">Notes:</span> {log.description}
                        </p>
                        {(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                          <div>
                            {log.story_awards_gained.map(mi => (
                              <p key={mi.id} className="text-sm">
                                <span className="font-semibold">{mi.name}:</span> {mi.description}
                              </p>
                            ))}
                            <p className="text-sm line-through">{log.story_awards_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  </Fragment>
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
