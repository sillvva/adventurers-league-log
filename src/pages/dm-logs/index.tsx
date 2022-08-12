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
import { useAutoAnimate } from "@formkit/auto-animate/react";

const Characters: NextPageWithLayout = () => {
  const session = useSession();
  const level = useRef(1);
  const [parent1] = useAutoAnimate<HTMLTableSectionElement>();
  level.current = 1;

  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  return (
    <>
      <Head>
        <title>DM Logs</title>
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
            <li className="text-secondary">DM Logs</li>
          </ul>
        </div>
        {session.data?.user && (
          <div className="dropdown dropdown-end">
            <label tabIndex={1} className="btn btn-sm">
              <Icon path={mdiDotsHorizontal} size={1} />
            </label>
            <ul tabIndex={1} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a
                  download={`dm.json`}
                  href={`/api/exports/dm`}
                  target="_blank"
                  rel="noreferrer noopener">
                  Export
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>

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
            <tbody ref={parent1}>
              {/* {character.logs.map(log => {
                const level_gained = character.log_levels.find(gl => gl.id === log.id);
                if (level_gained) level.current += level_gained.levels;

                return (
                  <Fragment key={log.id}>
                    <tr>
                      <th className="align-top">
                        <p className="text-primary-content font-semibold">{log.name}</p>
                        {log.dm && log.type === "game" && (
                          <p className="text-sm text-neutral-content font-normal">
                            <span className="font-semibold">DM:</span> {log.dm.name}
                          </p>
                        )}
                        <div className="table-cell sm:hidden print:hidden font-normal">
                          {log.type === "game" && (
                            <>
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
                            </>
                          )}
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
                            <p className="text-sm line-through">{log.magic_items_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        </div>
                      </th>
                      <td className="align-top hidden sm:table-cell print:table-cell">
                        {log.type === "game" && (
                          <>
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
                          </>
                        )}
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
                          <Link href={`/characters/${params.characterId}/log/${log.id}`}>
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
              })} */}
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
