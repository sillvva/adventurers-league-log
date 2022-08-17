import { Items } from "$src/components/items";
import Layout from "$src/layouts/main";
import type { NextPageWithLayout } from "$src/pages/_app";
import { useQueryString } from "$src/utils/hooks";
import { concatenate, slugify } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiDotsHorizontal, mdiHome, mdiPencil, mdiPlus, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import MiniSearch from "minisearch";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CSSProperties, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

const minisearch = new MiniSearch({
  fields: ["logName", "magicItems", "storyAwards"],
  idField: "logId",
  searchOptions: {
    boost: { logName: 2 },
    prefix: true
  }
});

const Characters: NextPageWithLayout = () => {
  const session = useSession();
  const router = useRouter();
  const [parent1] = useAutoAnimate<HTMLDivElement>();
  const [parent2] = useAutoAnimate<HTMLTableSectionElement>();
  const [modal, setModal] = useState<{ name: string; description: string; date?: Date } | null>(null);
  const [search, setSearch] = useState("");
  const [descriptions, setDescriptions] = useState(false);

  const { data: params } = useQueryString(
    z.object({
      characterId: z.string()
    })
  );

  const { data: character } = trpc.useQuery(["characters.getOne", { characterId: params.characterId }], {
    ssr: true,
    refetchOnWindowFocus: false
  });

  const myCharacter = character?.user.id === session.data?.user?.id;

  const utils = trpc.useContext();
  const deleteLogMutation = trpc.useMutation(["_logs.delete"], {
    onSuccess() {
      utils.invalidateQueries(["characters.getOne", { characterId: params.characterId }]);
    }
  });

  const deleteCharacterMutation = trpc.useMutation(["_characters.delete"], {
    onSuccess() {
      router.replace("/characters");
    }
  });

  const logData = useMemo(() => {
    let level = 1;
    return character
      ? character.logs.map(log => {
          const level_gained = character.log_levels.find(gl => gl.id === log.id);
          if (level_gained) level += level_gained.levels;
          return {
            ...log,
            level_gained: level_gained?.levels || 0,
            total_level: level,
            score: 0
          };
        })
      : [];
  }, [character]);

  const indexed = useMemo(() => {
    return logData.map(log => ({
      logId: log.id,
      logName: log.name,
      magicItems: log.magic_items_gained.map(item => item.name).join(", "),
      storyAwards: log.story_awards_gained.map(item => item.name).join(", ")
    }));
  }, [logData]);

  useEffect(() => {
    if (indexed.length) minisearch.addAll(indexed);
    return () => minisearch.removeAll();
  }, [indexed]);

  const toggleDescriptions = useCallback(() => {
    localStorage.setItem("descriptions", descriptions ? "false" : "true");
    setDescriptions(!descriptions);
  }, [descriptions]);

  useEffect(() => {
    setDescriptions(localStorage.getItem("descriptions") === "true");
  }, []);

  const results = useMemo(() => {
    if (logData.length) {
      if (search.length) {
        const results = minisearch.search(search);
        return logData
          .filter(log => results.find(result => result.id === log.id))
          .map(log => ({ ...log, score: results.find(result => result.id === log.id)?.score || 0 - log.date.getTime() }))
          .sort((a, b) => (b.score > a.score ? 1 : -1));
      } else {
        return logData.sort((a, b) => (b.date < a.date ? 1 : -1));
      }
    } else {
      return [];
    }
  }, [search, logData]);

  if (!character)
    return (
      <>
        <Head>
          <title>Character</title>
        </Head>
        <div className="flex justify-center items-center w-full h-96">
          <div className="radial-progress text-secondary animate-spin" style={{ "--value": 20 } as CSSProperties} />
        </div>
      </>
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
        {myCharacter && (
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
                <h4 className="font-semibold">Level</h4>
                <div className="flex-1 text-right">{character.total_level}</div>
              </div>
              <div className="flex">
                <h4 className="font-semibold">Tier</h4>
                <div className="flex-1 text-right">{character.tier}</div>
              </div>
              <div className="flex">
                <h4 className="font-semibold">Gold</h4>
                <div className="flex-1 text-right">{character.total_gold.toLocaleString("en-US")}</div>
              </div>
              <div className="flex">
                <h4 className="font-semibold">Downtime</h4>
                <div className="flex-1 text-right">{character.total_dtd}</div>
              </div>
            </div>
            <div className="divider sm:divider-horizontal before:bg-neutral-content/50 after:bg-neutral-content/50"></div>
            <div className="flex-1 basis-full sm:basis-2/3 lg:basis-2/3 print:basis-2/3 flex flex-col">
              <div className="flex flex-col gap-4" ref={parent1}>
                <Items title="Story Awards" items={character.story_awards} />
                <Items title="Magic Items" items={character.magic_items} formatting />
              </div>
            </div>
          </div>
          <div className="flex gap-4 print:hidden">
            {myCharacter && (
              <Link href={`/characters/${params.characterId}/log/new`}>
                <a className="btn btn-primary btn-sm">
                  <span className="hidden sm:inline">New Log</span>
                  <Icon path={mdiPlus} size={1} className="inline sm:hidden" />
                </a>
              </Link>
            )}
            <input type="text" placeholder="Search" onChange={e => setSearch(e.target.value)} className="input input-bordered input-sm w-full max-w-xs" />
            <div className="form-control">
              <label className="label py-1 cursor-pointer">
                <span className="label-text pr-4 hidden sm:inline">Descriptions</span>
                <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={descriptions} onChange={toggleDescriptions} />
              </label>
            </div>
          </div>
        </div>
        {character.image_url && (
          <div className="relative w-56 max-h-80 print:w-40 hidden md:flex print:hidden flex-col justify-center items-end ml-8">
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
                <th className="print:p-2">Log Entry</th>
                <th className="hidden sm:table-cell print:table-cell print:p-2">Advancement</th>
                <th className="hidden sm:table-cell print:table-cell print:p-2">Treasure</th>
                <th className="hidden md:table-cell print:!hidden">Story Awards</th>
                {myCharacter && <th className="print:hidden"></th>}
              </tr>
            </thead>
            <tbody ref={parent2}>
              {results.map(log => (
                <Fragment key={log.id}>
                  <tr className="print:text-sm">
                    <th
                      className={concatenate(
                        "align-top !static print:p-2",
                        (log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
                      )}>
                      <p
                        className="text-primary-content font-semibold whitespace-pre-wrap"
                        onClick={() => log.description && setModal({ name: log.name, description: log.description, date: log.date })}>
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
                              <span className="font-semibold">Levels:</span> {log.level_gained} {`(${log.total_level})`}
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
                          <Items title="Magic Items" items={log.magic_items_gained} />
                          <p className="text-sm line-through">{log.magic_items_lost.map(mi => mi.name).join(" | ")}</p>
                        </div>
                      </div>
                    </th>
                    <td
                      className={concatenate(
                        "align-top hidden sm:table-cell print:table-cell print:p-2",
                        (log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
                      )}>
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
                      {log.level_gained > 0 && (
                        <p>
                          <span className="font-semibold">Levels:</span> {log.level_gained} {`(${log.total_level})`}
                        </p>
                      )}
                      {log.dtd !== 0 && (
                        <p>
                          <span className="font-semibold text-sm">Downtime Days:</span> {log.dtd}
                        </p>
                      )}
                    </td>
                    <td
                      className={concatenate(
                        "align-top hidden sm:table-cell print:table-cell print:p-2",
                        (log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
                      )}>
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
                          <Items title="Magic Items" items={log.magic_items_gained} />
                          <p className="text-sm line-through whitespace-pre-wrap">{log.magic_items_lost.map(mi => mi.name).join(" | ")}</p>
                        </div>
                      )}
                    </td>
                    <td
                      className={concatenate(
                        "align-top hidden md:table-cell print:!hidden",
                        (log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
                      )}>
                      {(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                        <div>
                          <Items items={log.story_awards_gained} />
                          <p className="text-sm line-through whitespace-pre-wrap">{log.story_awards_lost.map(mi => mi.name).join(" | ")}</p>
                        </div>
                      )}
                    </td>
                    {myCharacter && (
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
                              deleteLogMutation.mutate({ logId: log.id });
                            }}>
                            <Icon path={mdiTrashCan} size={0.8} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                    <tr className={concatenate(!descriptions && "hidden print:table-row")}>
                      <td colSpan={100} className="print:p-2 print:pt-0">
                        <p className="text-sm whitespace-pre-wrap">
                          <span className="font-semibold">Notes:</span> {log.description}
                        </p>
                        {(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                          <div>
                            {log.story_awards_gained.map(mi => (
                              <p key={mi.id} className="text-sm whitespace-pre-wrap">
                                <span className="font-semibold">
                                  {mi.name}
                                  {mi.description ? ":" : ""}
                                </span>{" "}
                                {mi.description}
                              </p>
                            ))}
                            <p className="text-sm line-through whitespace-pre-wrap">{log.story_awards_lost.map(mi => mi.name).join(" | ")}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <label className={concatenate("modal cursor-pointer", modal && "modal-open")} onClick={() => setModal(null)}>
        {modal && (
          <label className="modal-box relative">
            <h3 className="text-lg font-bold text-primary-content">{modal.name}</h3>
            {modal.date && <p className="text-xs text-neutral-content">{modal.date.toLocaleString()}</p>}
            <p className="text-xs sm:text-sm pt-4 whitespace-pre-wrap">{modal.description}</p>
          </label>
        )}
      </label>
    </>
  );
};

Characters.getLayout = page => {
  return <Layout>{page}</Layout>;
};

export default Characters;
