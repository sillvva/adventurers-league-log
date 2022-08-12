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
import { concatenate, slugify, tooltipClasses } from "$src/utils/misc";
import { useAutoAnimate } from "@formkit/auto-animate/react";

const Characters: NextPageWithLayout = () => {
  const session = useSession();
  const router = useRouter();
  const level = useRef(1);
  const [parent1] = useAutoAnimate<HTMLDivElement>();
  const [parent2] = useAutoAnimate<HTMLTableSectionElement>();
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
            <li className="text-secondary whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">{character.name}</li>
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
                <a
                  download={`${slugify(character.name)}.json`}
                  href={`/api/exports/characters/${params.characterId}`}
                  target="_blank"
                  rel="noreferrer noopener">
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
                <span className="print:hidden">
                  {" - "}
                  <a href={character.character_sheet_url} target="_blank" rel="noreferrer noopner" className="text-secondary drop-shadow-sm font-semibold">
                    Character Sheet
                  </a>
                </span>
              )}
            </p>
          </div>
          <div className="flex-1 flex flex-wrap sm:flex-nowrap print:flex-nowrap gap-4 sm:gap-4 md:gap-6">
            <div className="basis-1/2 sm:basis-1/3 lg:basis-1/3 print:basis-1/3 flex flex-col gap-2 sm:gap-4">
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
              <div className="flex">
                <h4 className="font-semibold text-secondary-content">Downtime Days</h4>
                <div className="flex-1 text-right">{character.total_dtd}</div>
              </div>
            </div>
            <div className="divider sm:divider-horizontal before:bg-neutral-content/50 after:bg-neutral-content/50"></div>
            <div className="flex-1 basis-full sm:basis-2/3 lg:basis-2/3 print:basis-2/3 flex flex-col">
              <div className="flex flex-col gap-4" ref={parent1}>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-semibold text-secondary-content mb-2">Story Awards</h4>
                  <p className="flex flex-wrap divide-x text-sm">
                    {character.story_awards.length
                      ? character.story_awards.map(mi => (
                          <span
                            key={mi.id}
                            className={concatenate(mi.description?.trim() && "tooltip", "tooltip-bottom px-2 first:pl-0")}
                            data-tip={mi.description}>
                            {mi.name}
                          </span>
                        ))
                      : "None"}
                  </p>
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-semibold text-secondary-content mb-2">Magic Items</h4>
                  <p className="flex flex-wrap divide-x text-sm">
                    {character.magic_items.length
                      ? character.magic_items.map(mi => (
                          <span
                            key={mi.id}
                            className={concatenate(mi.description?.trim() && "tooltip", "tooltip-bottom px-2 first:pl-0")}
                            data-tip={mi.description}>
                            {mi.name}
                          </span>
                        ))
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 print:hidden">
            {session.data?.user && (
              <Link href={`/characters/${params.characterId}/log/new`}>
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
        <div className="rounded-lg">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Log Entry</th>
                <th className="hidden sm:table-cell print:table-cell">Advancement</th>
                <th className="hidden sm:table-cell print:table-cell">Treasure</th>
                <th className="hidden md:table-cell print:!hidden">Story Awards</th>
                <th className="print:hidden"></th>
              </tr>
            </thead>
            <tbody ref={parent2}>
              {character.logs.map(log => {
                const level_gained = character.log_levels.find(gl => gl.id === log.id);
                if (level_gained) level.current += level_gained.levels;

                return (
                  <Fragment key={log.id}>
                    <tr>
                      <th className="align-top !static">
                        <p className={concatenate("text-primary-content font-semibold", tooltipClasses(log.description, "left"))} data-tip={log.description}>
                          {log.name}
                        </p>
                        <p className="text-netural-content font-normal text-xs">
                          {(log.is_dm_log && log.applied_date ? log.applied_date : log.date).toLocaleString()}
                        </p>
                        {log.dm && log.type === "game" && log.dm.uid !== character.user.id && (
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
                          {log.dtd !== 0 && (
                            <p>
                              <span className="font-semibold">Downtime Days:</span> {log.dtd}
                            </p>
                          )}
                          {log.tcp !== 0 && (
                            <p>
                              <span className="font-semibold">TCP:</span> {log.tcp}
                            </p>
                          )}
                          {log.gold !== 0 && (
                            <p>
                              <span className="font-semibold">Gold:</span> {log.gold.toLocaleString("en-US")}
                            </p>
                          )}
                          <div>
                            <p className="font-semibold">Magic Items:</p>
                            <p className="flex flex-wrap divide-x text-sm">
                              {log.magic_items_gained.length
                                ? log.magic_items_gained.map(mi => (
                                    <span
                                      key={mi.id}
                                      className={concatenate("px-2 first:pl-0", tooltipClasses(mi.description, "left"))}
                                      data-tip={mi.description}>
                                      {mi.name}
                                    </span>
                                  ))
                                : "None"}
                            </p>
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
                            {log.dtd !== 0 && (
                              <p>
                                <span className="font-semibold text-sm">Downtime Days:</span> {log.dtd}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="align-top hidden sm:table-cell print:table-cell">
                        {log.tcp !== 0 && (
                          <p>
                            <span className="font-semibold">TCP:</span> {log.tcp}
                          </p>
                        )}
                        {log.gold !== 0 && (
                          <p>
                            <span className="font-semibold">Gold:</span> {log.gold.toLocaleString("en-US")}
                          </p>
                        )}
                        {(log.magic_items_gained.length > 0 || log.magic_items_lost.length > 0) && (
                          <div>
                            <p className="font-semibold">Magic Items:</p>
                            <p className="flex flex-wrap divide-x text-sm">
                              {log.magic_items_gained.length
                                ? log.magic_items_gained.map(mi => (
                                    <span
                                      key={mi.id}
                                      className={concatenate("tooltip-bottom px-2 first:pl-0", tooltipClasses(mi.description))}
                                      data-tip={mi.description}>
                                      {mi.name}
                                    </span>
                                  ))
                                : "None"}
                            </p>
                            <p className="text-sm line-through">{log.magic_items_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        )}
                      </td>
                      <td className="align-top hidden md:table-cell print:!hidden">
                        {(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                          <div>
                            <p className="flex flex-wrap divide-x text-sm">
                              {log.story_awards_gained.length
                                ? log.story_awards_gained.map(mi => (
                                    <span
                                      key={mi.id}
                                      className={concatenate("tooltip-bottom px-2 first:pl-0", tooltipClasses(mi.description, "right"))}
                                      data-tip={mi.description}>
                                      {mi.name}
                                    </span>
                                  ))
                                : "None"}
                            </p>
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
                                <span className="font-semibold">
                                  {mi.name}
                                  {mi.description ? ":" : ""}
                                </span>{" "}
                                {mi.description}
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
