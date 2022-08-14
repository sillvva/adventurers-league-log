import { Items } from "$src/components/items";
import Layout from "$src/layouts/main";
import type { NextPageWithLayout } from "$src/pages/_app";
import { concatenate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiDotsHorizontal, mdiHome, mdiPencil, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import MiniSearch from "minisearch";
import { GetServerSideProps } from "next";
import { unstable_getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { authOptions } from "../api/auth/[...nextauth]";

const minisearch = new MiniSearch({
  fields: ["logName", "characterName", "magicItems", "storyAwards"],
  idField: "logId",
  searchOptions: {
    boost: { logName: 2 },
    prefix: true
  }
});

const Characters: NextPageWithLayout = () => {
  const [parent1] = useAutoAnimate<HTMLTableSectionElement>();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ name: string; description: string; date?: Date } | null>(null);

  const utils = trpc.useContext();
  const { data: logs } = trpc.useQuery(["_logs.dm-logs"]);
  const deleteLogMutation = trpc.useMutation(["_logs.delete"], {
    onSuccess() {
      utils.invalidateQueries(["_logs.dm-logs"]);
    }
  });

  const indexed = useMemo(() => {
    return logs
      ? logs.map(log => ({
          logId: log.id,
          logName: log.name,
          magicItems: log.magic_items_gained.map(item => item.name).join(", "),
          storyAwards: log.story_awards_gained.map(item => item.name).join(", ")
        }))
      : [];
  }, [logs]);

  useEffect(() => {
    if (indexed.length) minisearch.addAll(indexed);
    return () => minisearch.removeAll();
  }, [indexed]);

  const results = useMemo(() => {
    if (logs && indexed.length) {
      if (search.length) {
        const results = minisearch.search(search);
        return logs
          .filter(log => results.find(result => result.id === log.id))
          .map(log => ({ ...log, score: results.find(result => result.id === log.id)?.score || 0 - log.date.getTime() }))
          .sort((a, b) => (b.score > a.score ? 1 : -1));
      } else {
        return logs.sort((a, b) => (b.date < a.date ? 1 : -1));
      }
    } else {
      return [];
    }
  }, [indexed, search, logs]);

  return (
    <>
      <Head>
        <title>DM Logs</title>
      </Head>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4 print:hidden">
          <div className="flex-1 text-sm breadcrumbs">
            <ul>
              <li>
                <Icon path={mdiHome} className="w-4" />
              </li>
              <li className="text-secondary drop-shadow-md">DM Logs</li>
            </ul>
          </div>
          {logs && logs.length > 0 && (
            <div className="flex-1 flex justify-end">
              <Link href="/dm-logs/new">
                <a className="btn btn-primary btn-sm">New Log</a>
              </Link>
            </div>
          )}
          <div className="dropdown dropdown-end">
            <label tabIndex={1} className="btn btn-sm">
              <Icon path={mdiDotsHorizontal} size={1} />
            </label>
            <ul tabIndex={1} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a download={`dm.json`} href={`/api/exports/dm`} target="_blank" rel="noreferrer noopener">
                  Export
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <input type="text" placeholder="Search" onChange={e => setSearch(e.target.value)} className="input input-bordered input-sm w-full sm:max-w-xs" />
        </div>

        <section>
          <div className="rounded-lg">
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
                {results.map(log => (
                  <Fragment key={log.id}>
                    <tr>
                      <th
                        className={concatenate(
                          "align-top !static",
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
                        {log.character && (
                          <p className="text-sm text-neutral-content font-normal">
                            <span className="font-semibold">Character:</span> {log.character.name}
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
                              {log.level > 0 && (
                                <p>
                                  <span className="font-semibold">Level:</span> {log.level}
                                </p>
                              )}
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
                          "align-top hidden sm:table-cell print:table-cell",
                          (log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
                        )}>
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
                            {log.level > 0 && (
                              <p>
                                <span className="font-semibold">Level:</span> {log.level}
                              </p>
                            )}
                            {log.dtd !== 0 && (
                              <p>
                                <span className="font-semibold text-sm">Downtime Days:</span> {log.dtd}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td
                        className={concatenate(
                          "align-top hidden sm:table-cell print:table-cell",
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
                      <td className="w-8 print:hidden">
                        <div className="flex flex-col justify-center gap-2">
                          <Link href={`/dm-logs/${log.id}`}>
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
                    </tr>
                    {(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
                      <tr className="hidden print:table-row">
                        <td colSpan={3} className="pt-0">
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
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <label className={concatenate("modal cursor-pointer", modal && "modal-open")} onClick={() => setModal(null)}>
        {modal && (
          <label className="modal-box relative">
            <h3 className="text-lg font-bold text-primary-content">{modal.name}</h3>
            {modal.date && <p className="text-xs text-neutral-content">{modal.date.toLocaleString()}</p>}
            <p className="text-xs sm:text-sm pt-4">{modal.description}</p>
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

export const getServerSideProps: GetServerSideProps = async context => {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    };
  }

  return {
    props: {
      session
    }
  };
};
