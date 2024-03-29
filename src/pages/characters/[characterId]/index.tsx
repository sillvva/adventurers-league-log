import { Items } from "$src/components/items";
import { Markdown } from "$src/components/markdown";
import { SearchResults } from "$src/components/search";
import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "$src/server/db/client";
import { useQueryString } from "$src/utils/hooks";
import { slugify } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import MiniSearch from "minisearch";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiDotsHorizontal, mdiHome, mdiPencil, mdiPlus, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";

import type { NextPageWithLayout } from "$src/pages/_app";
import type { InferPropsFromServerSideFunction } from "ddal";
import type { GetServerSidePropsContext } from "next";
import type { CSSProperties } from "react";

let stopWords = new Set(["and", "or", "to", "in", "a", "the"]);
const minisearch = new MiniSearch({
	fields: ["logName", "magicItems", "storyAwards"],
	idField: "logId",
	processTerm: term => (stopWords.has(term) ? null : term.toLowerCase()),
	searchOptions: {
		prefix: true
	}
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions);
	const characterId = typeof context.query.characterId === "string" ? context.query.characterId : "";
	const character = await prisma.character.findFirst({
		where: {
			id: characterId
		},
		select: {
			id: true,
			name: true,
			campaign: true,
			character_sheet_url: true,
			image_url: true,
			race: true,
			class: true,
			user: true
			// logs: {
			// 	include: {
			// 		dm: true,
			// 		magic_items_gained: true,
			// 		magic_items_lost: true,
			// 		story_awards_gained: true,
			// 		story_awards_lost: true
			// 	},
			// 	orderBy: {
			// 		date: "asc"
			// 	}
			// }
		}
	});

	if (!character) return { redirect: { destination: "/characters", permanent: false } };

	// const logSummary = getLogsSummary(character.logs);
	// const logs = logSummary.logs.map(log => ({
	// 	...log,
	// 	date: log.date.toISOString(),
	// 	applied_date: log.applied_date?.toISOString() || null,
	// 	created_at: log.created_at.toISOString()
	// }));

	return {
		props: {
			session,
			character
			// character: {
			// 	...character,
			// 	logs: {
			// 		...logSummary,
			// 		logs: logs
			// 	}
			// }
		}
	};
};

const Characters: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session, character }) => {
	const router = useRouter();
	const [parent1] = useAutoAnimate<HTMLDivElement>();
	const [parent2] = useAutoAnimate<HTMLTableSectionElement>();
	const [modal, setModal] = useState<{
		name: string;
		description: string;
		date?: Date;
	} | null>(null);
	const [search, setSearch] = useState("");

	const { data: params } = useQueryString(
		z.object({
			characterId: z.string()
		})
	);

	// const logsLoading = false;
	const { data: logData, isLoading: logsLoading } = trpc.useQuery(["characters.getLogs", { characterId: params.characterId }], {
		refetchOnWindowFocus: false,
		refetchOnMount: false
	});

	// const logs = useMemo(
	// 	() => ({
	// 		...character.logs,
	// 		logs: character.logs.logs.map(log => ({
	// 			...log,
	// 			date: new Date(log.date),
	// 			applied_date: log.applied_date ? new Date(log.applied_date) : null,
	// 			created_at: new Date(log.created_at)
	// 		}))
	// 	}),
	// 	[character.logs]
	// );

	const myCharacter = character.user?.id === session?.user?.id;
	const [descriptions, setDescriptions] = useState(true);

	const utils = trpc.useContext();
	const deleteLogMutation = trpc.useMutation(["_logs.delete"], {
		onSuccess() {
			utils.invalidateQueries(["characters.getLogs", { characterId: params.characterId }]);
			utils.invalidateQueries(["_dms.getMany"]);
			utils.refetchQueries(["characters.getAll", { userId: session?.user?.id || "" }]);
		}
	});

	const deleteCharacterMutation = trpc.useMutation(["_characters.delete"], {
		onSuccess() {
			router.replace("/characters");
		}
	});

	const logs = useMemo(() => {
		let level = 1;
		return logData
			? logData.logs.map(log => {
					const level_gained = logData.log_levels.find(gl => gl.id === log.id);
					if (level_gained) level += level_gained.levels;
					return {
						...log,
						level_gained: level_gained?.levels || 0,
						total_level: level,
						score: 0
					};
			  })
			: [];
	}, [logData]);

	const indexed = useMemo(() => {
		return logs.map(log => ({
			logId: log.id,
			logName: log.name,
			magicItems: [...log.magic_items_gained.map(item => item.name), ...log.magic_items_lost.map(item => item.name)].join(", "),
			storyAwards: [...log.story_awards_gained.map(item => item.name), ...log.story_awards_lost.map(item => item.name)].join(", ")
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
		setDescriptions(localStorage.getItem("descriptions") !== "false");
	}, []);

	const results = useMemo(() => {
		if (logs.length) {
			if (search.length > 1) {
				const results = minisearch.search(search);
				return logs
					.filter(log => results.find(result => result.id === log.id))
					.map(log => ({
						...log,
						score: results.find(result => result.id === log.id)?.score || 0 - log.date.getTime()
					}))
					.sort((a, b) => a.date.getTime() - b.date.getTime());
			} else {
				return logs.sort((a, b) => a.date.getTime() - b.date.getTime());
			}
		} else {
			return [];
		}
	}, [search, logs]);

	let description = `${character.race} ${character.class}`;
	if (!description.trim()) description = "An online log sheet made for Adventurers League characters";

	return (
		<>
			<Head>
				<title>{`${character.name} - Adventurers League Log Sheet`}</title>
				<meta name="title" content={`${character.name} - Adventurers League Log Sheet`} />
				<meta name="description" content={description} />
				<meta property="og:title" content={character.name} />
				<meta property="og:site_name" content="Adventurers League Log Sheet" />
				<meta property="og:description" content={description} />
				<meta property="og:image" content={character.image_url || "https://ddal.dekok.app/images/barovia-gate.jpg"} />
				<meta property="twitter:title" content={character.name} />
				<meta property="twitter:site" content="Adventurers League Log Sheet" />
				<meta property="twitter:description" content={description} />
				<meta property="twitter:image" content={character.image_url || "https://ddal.dekok.app/images/barovia-gate.jpg"} />
			</Head>

			<div className="flex gap-4 print:hidden">
				<div className="breadcrumbs mb-4 flex-1 text-sm">
					<ul>
						<li>
							<Icon path={mdiHome} className="w-4" />
						</li>
						<li>
							<Link href="/characters" className="text-secondary">
								Characters
							</Link>
						</li>
						<li className="overflow-hidden text-ellipsis whitespace-nowrap dark:drop-shadow-md">{character.name}</li>
					</ul>
				</div>
				{myCharacter && (
					<>
						<Link href={`/characters/${params.characterId}/edit`} className="btn-primary btn-sm btn hidden sm:flex">
							Edit
						</Link>
						<div className="dropdown-end dropdown">
							<label tabIndex={1} className="btn-sm btn">
								<Icon path={mdiDotsHorizontal} size={1} />
							</label>
							<ul tabIndex={1} className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow">
								<li className="flex sm:hidden">
									<Link href={`/characters/${params.characterId}/edit`}>Edit</Link>
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
										className="bg-red-600 text-white hover:bg-red-900"
										onClick={() => {
											if (confirm("Are you sure you want to delete this character? This action cannot be undone.")) {
												deleteCharacterMutation.mutate({
													id: params.characterId
												});
											}
										}}>
										Delete
									</a>
								</li>
							</ul>
						</div>
					</>
				)}
			</div>

			<section className="flex">
				<div className="flex flex-1 flex-col gap-6">
					<div className="flex flex-col">
						<h3 className="flex-1 font-vecna text-4xl font-bold text-accent-content">{character.name}</h3>
						<p className="flex-1 text-sm font-semibold">
							{character.race} {character.class}
						</p>
						<p className="flex-1 text-xs">
							{character.campaign}
							{character.character_sheet_url && (
								<span className="print:hidden">
									{" - "}
									<a href={character.character_sheet_url} target="_blank" rel="noreferrer noopner" className="font-semibold text-secondary dark:drop-shadow-sm">
										Character Sheet
									</a>
								</span>
							)}
						</p>
					</div>
					<div className="flex flex-1 flex-wrap gap-4 print:flex-nowrap sm:flex-nowrap sm:gap-4 md:gap-6">
						<div className="flex basis-full flex-col gap-2 print:basis-1/3 sm:gap-4 md:basis-52">
							{character.image_url && (
								<div className="relative hidden flex-col items-end justify-center print:hidden md:flex">
									<a href={character.image_url} target="_blank" rel="noreferrer noopener" className="mask mask-squircle mx-auto h-52 w-full bg-primary">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img src={character.image_url} className="h-full w-full object-cover object-top transition-all" alt={character.name} />
									</a>
								</div>
							)}
							<div className="flex">
								<h4 className="font-semibold">Level</h4>
								<div className="flex-1 text-right">{logData?.total_level}</div>
							</div>
							<div className="flex">
								<h4 className="font-semibold">Tier</h4>
								<div className="flex-1 text-right">{logData?.tier}</div>
							</div>
							<div className="flex">
								<h4 className="font-semibold">Gold</h4>
								<div className="flex-1 text-right">{logData?.total_gold.toLocaleString("en-US")}</div>
							</div>
							<div className="flex">
								<h4 className="font-semibold">Downtime</h4>
								<div className="flex-1 text-right">{logData?.total_dtd}</div>
							</div>
						</div>
						<div className="divider hidden sm:divider-horizontal before:bg-neutral-content/50 after:bg-neutral-content/50 print:flex sm:flex"></div>
						<div className="flex flex-1 basis-full flex-col print:basis-2/3 sm:basis-2/3 lg:basis-2/3">
							{logData && (
								<div className="flex flex-col gap-4" ref={parent1}>
									<Items title="Story Awards" items={logData.story_awards} collapsible />
									<Items title="Magic Items" items={logData.magic_items} collapsible formatting />
								</div>
							)}
						</div>
					</div>
					<div className="flex gap-4 print:hidden">
						{myCharacter ? (
							<Link href={`/characters/${params.characterId}/log/new`} className="btn-primary btn-sm btn px-2 sm:px-3">
								<span className="hidden sm:inline">New Log</span>
								<Icon path={mdiPlus} size={1} className="inline sm:hidden" />
							</Link>
						) : character && !logsLoading ? null : (
							<span className="btn-sm btn">Loading...</span>
						)}
						{logs && (
							<>
								<input
									type="text"
									placeholder="Search"
									onChange={e => setSearch(e.target.value)}
									className="input-bordered input input-sm w-full sm:max-w-xs"
								/>
								{myCharacter && (
									<div className="form-control">
										<label className="label cursor-pointer py-1">
											<span className="label-text hidden pr-4 sm:inline">Notes</span>
											<input type="checkbox" className="toggle-primary toggle" checked={descriptions} onChange={toggleDescriptions} />
										</label>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</section>
			{logs ? (
				<section className="mt-6">
					<div className="w-full overflow-x-auto rounded-lg bg-base-100">
						<table className="table w-full">
							<thead>
								<tr className="bg-base-300">
									<td className="print:p-2">Log Entry</td>
									<td className="hidden print:table-cell print:p-2 sm:table-cell">Advancement</td>
									<td className="hidden print:table-cell print:p-2 sm:table-cell">Treasure</td>
									<td className="hidden print:!hidden md:table-cell">Story Awards</td>
									{myCharacter && <td className="print:hidden"></td>}
								</tr>
							</thead>
							<tbody ref={parent2}>
								{results.map(log => (
									<Fragment key={log.id}>
										<tr className={twMerge("border-b-0 border-t-2 border-t-base-200 print:text-sm", log.saving && "opacity-50")}>
											<td
												className={twMerge(
													"!static align-top print:p-2",
													log.saving && "bg-neutral-focus",
													(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "border-b-0"
												)}>
												<p
													className="whitespace-pre-wrap font-semibold text-accent-content"
													onClick={() =>
														log.description &&
														!descriptions &&
														setModal({
															name: log.name,
															description: log.description,
															date: log.date
														})
													}>
													<SearchResults text={log.name} search={search} />
												</p>
												<p className="text-netural-content mb-2 text-xs font-normal" suppressHydrationWarning>
													{new Date(log.is_dm_log && log.applied_date ? log.applied_date : log.date).toLocaleString()}
												</p>
												{log.dm && log.type === "game" && log.dm.uid !== character.user.id && (
													<p className="text-sm font-normal">
														<span className="font-semibold">DM:</span> {log.dm.name}
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
														<Items title="Magic Items" items={log.magic_items_gained} search={search} />
														<p className="whitespace-pre-wrap text-sm line-through">
															<SearchResults text={log.magic_items_lost.map(mi => mi.name).join(" | ")} search={search} />
														</p>
													</div>
												</div>
											</td>
											<td
												className={twMerge(
													"hidden align-top print:table-cell print:p-2 sm:table-cell",
													log.saving && "bg-neutral-focus",
													(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "border-b-0"
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
														<span className="text-sm font-semibold">Downtime Days:</span> {log.dtd}
													</p>
												)}
											</td>
											<td
												className={twMerge(
													"hidden align-top print:table-cell print:p-2 sm:table-cell",
													log.saving && "bg-neutral-focus",
													(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "border-b-0"
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
														<Items title="Magic Items" items={log.magic_items_gained} search={search} />
														<div className="whitespace-pre-wrap text-sm line-through">
															<SearchResults text={log.magic_items_lost.map(mi => mi.name).join(" | ")} search={search} />
														</div>
													</div>
												)}
											</td>
											<td
												className={twMerge(
													"hidden align-top print:!hidden md:table-cell",
													log.saving && "bg-neutral-focus",
													(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "border-b-0"
												)}>
												{(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
													<div>
														<Items items={log.story_awards_gained} search={search} />
														<div className="whitespace-pre-wrap text-sm line-through">
															<SearchResults text={log.story_awards_lost.map(mi => mi.name).join(" | ")} search={search} />
														</div>
													</div>
												)}
											</td>
											{myCharacter && (
												<td
													className={twMerge(
														"w-8 align-top print:hidden",
														log.saving && "bg-neutral-focus",
														(log.description?.trim() || log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && "border-b-0"
													)}>
													<div className="flex flex-col justify-center gap-2">
														<Link
															href={`/characters/${params.characterId}/log/${log.id}`}
															className={twMerge("btn-primary btn-sm btn", log.saving && "btn-disabled")}>
															<Icon path={mdiPencil} size={0.8} />
														</Link>
														<button
															className="btn-sm btn"
															disabled={log.saving}
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
											<tr className={twMerge(!descriptions && "hidden print:table-row")}>
												<td
													colSpan={100}
													className={twMerge(
														"max-w-[calc(100vw_-_50px)] whitespace-pre-wrap pt-0 text-sm print:p-2 print:text-xs",
														log.saving && "bg-neutral-focus"
													)}>
													<h4 className="text-base font-semibold">Notes:</h4>
													<Markdown>{log.description || ""}</Markdown>
													{(log.story_awards_gained.length > 0 || log.story_awards_lost.length > 0) && (
														<div>
															{log.story_awards_gained.map(mi => (
																<div key={mi.id} className="whitespace-pre-wrap text-sm">
																	<span className="pr-2 font-semibold print:block">
																		{mi.name}
																		{mi.description ? ":" : ""}
																	</span>
																	<Markdown>{mi.description || ""}</Markdown>
																</div>
															))}
															<p className="whitespace-pre-wrap text-sm line-through">{log.story_awards_lost.map(mi => mi.name).join(" | ")}</p>
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
			) : (
				<div className="flex h-96 w-full items-center justify-center">
					<div className="radial-progress animate-spin text-secondary" style={{ "--value": 20 } as CSSProperties} />
				</div>
			)}

			<div className={twMerge("modal cursor-pointer", modal && "modal-open")} onClick={() => setModal(null)}>
				{modal && (
					<div className="modal-box relative cursor-default drop-shadow-lg" onClick={e => e.stopPropagation()}>
						<h3 className="cursor-text text-lg font-bold text-accent-content">{modal.name}</h3>
						{modal.date && (
							<p className="cursor-text text-xs" suppressHydrationWarning>
								{modal.date.toLocaleString()}
							</p>
						)}
						<Markdown className="cursor-text whitespace-pre-wrap pt-4 text-xs sm:text-sm">{modal.description}</Markdown>
					</div>
				)}
			</div>
		</>
	);
};

Characters.getLayout = page => {
	return <Layout>{page}</Layout>;
};

export default Characters;
