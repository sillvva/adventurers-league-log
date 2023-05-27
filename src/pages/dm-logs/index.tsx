import { Items } from "$src/components/items";
import { SearchResults } from "$src/components/search";
import Layout from "$src/layouts/main";
import { concatenate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import MiniSearch from "minisearch";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiDotsHorizontal, mdiHome, mdiPencil, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";

import { authOptions } from "../api/auth/[...nextauth]";
import { components } from "../characters/[characterId]";

import type { NextPageWithLayout } from "$src/pages/_app";
import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions);

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
	const { data: logs, isFetching } = trpc.useQuery(["_logs.dm-logs"], {
		refetchOnWindowFocus: false
	});
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
					characterName: log.character?.name || "",
					magicItems: [...log.magic_items_gained.map(item => item.name), ...log.magic_items_lost.map(item => item.name)].join(", "),
					storyAwards: [...log.story_awards_gained.map(item => item.name), ...log.story_awards_lost.map(item => item.name)].join(", ")
			  }))
			: [];
	}, [logs]);

	useEffect(() => {
		if (indexed.length) minisearch.addAll(indexed);
		return () => minisearch.removeAll();
	}, [indexed]);

	const results = useMemo(() => {
		if (logs && indexed.length) {
			if (search.length > 1) {
				const results = minisearch.search(search);
				return logs
					.filter(log => results.find(result => result.id === log.id))
					.map(log => ({ ...log, score: results.find(result => result.id === log.id)?.score || 0 - log.date.getTime() }))
					.sort((a, b) => (a.date > b.date ? 1 : -1));
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
					<div className="breadcrumbs flex-1 text-sm">
						<ul>
							<li>
								<Icon path={mdiHome} className="w-4" />
							</li>
							<li className="dark:drop-shadow-md">DM Logs</li>
						</ul>
					</div>
					{logs && logs.length > 0 && (
						<div className="flex flex-1 justify-end">
							<Link href="/dm-logs/new" className="btn-primary btn-sm btn">
								New Log
							</Link>
						</div>
					)}
					<div className="dropdown dropdown-end">
						<label tabIndex={1} className="btn-sm btn">
							<Icon path={mdiDotsHorizontal} size={1} />
						</label>
						<ul tabIndex={1} className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow">
							<li>
								<a download={`dm.json`} href={`/api/exports/dm`} target="_blank" rel="noreferrer noopener">
									Export
								</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="flex gap-4">
					<input type="text" placeholder="Search" onChange={e => setSearch(e.target.value)} className="input-bordered input input-sm w-full sm:max-w-xs" />
				</div>

				<section>
					<div className="rounded-lg">
						<table className="table w-full">
							<thead>
								<tr>
									<th className="table-cell print:hidden sm:hidden">Game</th>
									<th className="hidden print:table-cell sm:table-cell">Title</th>
									<th className="hidden print:table-cell sm:table-cell">Advancement</th>
									<th className="hidden print:table-cell sm:table-cell">Treasure</th>
									<th className="hidden print:!hidden sm:table-cell">Story Awards</th>
									<th className="print:hidden"></th>
								</tr>
							</thead>
							<tbody ref={parent1}>
								{!logs || logs.length == 0 ? (
									isFetching ? (
										<tr>
											<td colSpan={5} className="py-20 text-center">
												Loading...
											</td>
										</tr>
									) : (
										<tr>
											<td colSpan={5} className="py-20 text-center">
												<p className="mb-4">You have no DM logs.</p>
												<p>
													<Link href="/dm-logs/new" className="btn-primary btn">
														Create one now
													</Link>
												</p>
											</td>
										</tr>
									)
								) : (
									results.map(log => (
										<Fragment key={log.id}>
											<tr>
												<th
													className={concatenate(
														"!static align-top",
														(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "print:border-b-0"
													)}>
													<p
														className="whitespace-pre-wrap font-semibold text-accent-content"
														onClick={() => log.description && setModal({ name: log.name, description: log.description, date: log.date })}>
														<SearchResults text={log.name} search={search} />
													</p>
													<p className="text-netural-content text-xs font-normal">
														{(log.is_dm_log && log.applied_date ? log.applied_date : log.date).toLocaleString()}
													</p>
													{log.character && (
														<p className="text-sm font-normal">
															<span className="font-semibold">Character:</span>{" "}
															<Link href={`/characters/${log.character.id}`} className="text-secondary">
																<SearchResults text={log.character.name} search={search} />
															</Link>
														</p>
													)}
													<div className="table-cell font-normal print:hidden sm:hidden">
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
															<Items title="Magic Items" items={log.magic_items_gained} search={search} />
														</div>
													</div>
												</th>
												<td
													className={concatenate(
														"hidden align-top print:table-cell sm:table-cell",
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
																	<span className="text-sm font-semibold">Downtime Days:</span> {log.dtd}
																</p>
															)}
														</>
													)}
												</td>
												<td
													className={concatenate(
														"hidden align-top print:table-cell sm:table-cell",
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
													{log.magic_items_gained.length > 0 && (
														<div>
															<Items title="Magic Items" items={log.magic_items_gained} search={search} />
														</div>
													)}
												</td>
												<td
													className={concatenate(
														"hidden align-top print:!hidden md:table-cell",
														(log.description?.trim() || log.story_awards_gained.length > 0) && "print:border-b-0"
													)}>
													{log.story_awards_gained.length > 0 && (
														<div>
															<Items items={log.story_awards_gained} search={search} />
														</div>
													)}
												</td>
												<td className="w-8 print:hidden">
													<div className="flex flex-col justify-center gap-2">
														<Link href={`/dm-logs/${log.id}`} className="btn-primary btn-sm btn">
															<Icon path={mdiPencil} size={0.8} />
														</Link>
														<button
															className="btn-sm btn"
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
														{log.story_awards_gained.length > 0 && (
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
															</div>
														)}
													</td>
												</tr>
											)}
										</Fragment>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			<label className={concatenate("modal cursor-pointer", modal && "modal-open")} onClick={() => setModal(null)}>
				{modal && (
					<label className="modal-box relative">
						<h3 className="text-lg font-bold text-accent-content">{modal.name}</h3>
						{modal.date && <p className="text-xs">{modal.date.toLocaleString()}</p>}
						<ReactMarkdown className="whitespace-pre-wrap pt-4 text-xs sm:text-sm" components={components} remarkPlugins={[remarkGfm]}>
							{modal.description}
						</ReactMarkdown>
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
