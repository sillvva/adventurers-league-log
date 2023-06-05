import AutoFillSelect from "$src/components/autofill";
import AutoResizeTextArea from "$src/components/textarea";
import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { prisma } from "$src/server/db/client";
import { getOne } from "$src/server/router/routers/characters";
import { logSchema } from "$src/types/zod-schema";
import { useQueryString } from "$src/utils/hooks";
import { getLogsSummary } from "$src/utils/logs";
import { formatDate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { mdiAlertCircle, mdiHome, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";

import type { NextPageWithLayout } from "$src/pages/_app";
import type { DungeonMaster, LogType, MagicItem } from "@prisma/client";
import type { InferPropsFromServerSideFunction } from "ddal";
import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	let session = await getServerSession(context.req, context.res, authOptions);

	if (!session) {
		return {
			redirect: {
				destination: "/",
				permanent: false
			}
		};
	}

	const characterId = typeof context.query.characterId === "string" ? context.query.characterId : "";
	const character = await getOne(prisma, characterId);

	if (character.userId !== session.user?.id) {
		return {
			redirect: {
				destination: `/characters/${characterId}`,
				permanent: false
			}
		};
	}

	return {
		props: {
			session,
			character: {
				...character,
				logs: character.logs.map(log => ({
					...log,
					date: log.date.toISOString(),
					created_at: log.created_at.toISOString(),
					applied_date: log.applied_date === null ? null : log.applied_date.toISOString()
				})),
				created_at: character.created_at.toISOString()
			}
		}
	};
};

const EditLog: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session, character }) => {
	const router = useRouter();
	const { data: params } = useQueryString(
		z.object({
			characterId: z.string(),
			logId: z.string()
		})
	);

	const form = useForm<z.infer<typeof logSchema>>({
		resolver: zodResolver(logSchema)
	});

	const selectedLog = useMemo(
		() =>
			character.logs
				.map(log => ({
					...log,
					date: new Date(log.date),
					applied_date: log.applied_date !== null ? new Date(log.applied_date) : null,
					created_at: new Date(log.created_at)
				}))
				.find(g => g.id === params.logId) || {
				characterId: params.characterId,
				id: "",
				name: "",
				description: "",
				date: new Date(),
				type: "game" as LogType,
				created_at: new Date(),
				experience: 0,
				acp: 0,
				tcp: 0,
				level: 0,
				gold: 0,
				dtd: 0,
				dungeonMasterId: "",
				dm: {
					id: "",
					name: "",
					DCI: null,
					uid: ""
				},
				applied_date: new Date(),
				is_dm_log: false,
				magic_items_gained: [],
				magic_items_lost: [],
				story_awards_gained: [],
				story_awards_lost: []
			},
		[params, character]
	);

	const [parent1] = useAutoAnimate<HTMLDivElement>();
	const [parent2] = useAutoAnimate<HTMLDivElement>();
	const [season, setSeason] = useState<1 | 8 | 9>(selectedLog?.experience ? 1 : selectedLog?.acp ? 8 : 9);
	const [type, setType] = useState<LogType>(selectedLog.type || "game");
	const [saving, setSaving] = useState(false);
	const [magicItemsGained, setMagicItemsGained] = useState(
		selectedLog.magic_items_gained.map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
	);
	const [magicItemsLost, setMagicItemsLost] = useState<string[]>(selectedLog.magic_items_lost.map(mi => mi.id));
	const [storyAwardsGained, setStoryAwardsGained] = useState(
		(selectedLog?.story_awards_gained || []).map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
	);
	const [storyAwardsLost, setStoryAwardsLost] = useState<string[]>(selectedLog.story_awards_lost.map(mi => mi.id));
	const [mutError, setMutError] = useState<string | null>(null);

	const { data: dms } = trpc.useQuery(["_characters.getDMs"], {
		refetchOnWindowFocus: false
	});

	const utils = trpc.useContext();
	const mutation = trpc.useMutation(["_logs.save"], {
		async onSuccess(log) {
			if (log?.characterId) {
				const logData = utils.getQueryData(["characters.getLogs", { characterId: log.characterId }]);
				if (logData) {
					logData.logs.splice(
						logData.logs.findIndex(l => l.id === log.id),
						params.logId === "new" ? 0 : 1,
						log
					);
					logData.logs = logData.logs.map(l => {
						l.magic_items_gained = l.magic_items_gained.map(mi => {
							if (log.magic_items_lost.find(mil => mil.id === mi.id)) mi.logLostId = log.id;
							return mi;
						});
						l.story_awards_gained = l.story_awards_gained.map(sa => {
							if (log.story_awards_lost.find(sal => sal.id === sa.id)) sa.logLostId = log.id;
							return sa;
						});
						return l;
					});
					utils.setQueryData(["characters.getLogs", { characterId: log.characterId }], getLogsSummary(logData.logs));
				} else await utils.invalidateQueries(["characters.getLogs", { characterId: log.characterId }]);
				utils.refetchQueries(["characters.getAll", { userId: session.user?.id || "" }]);
			}
			router.push(`/characters/${params.characterId}`);
		},
		onError(err) {
			setMutError(err.message);
			setSaving(false);
		}
	});

	const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const activeName = document.activeElement?.getAttribute("name");
		if (activeName === "dm.name" && !form.getValues("dm.name")) return;
		if (activeName === "dm.DCI" && !form.getValues("dm.DCI")) return;

		const acp = form.getValues("acp");
		if (character.total_level == 20 && acp - selectedLog.acp > 0) {
			form.setError("acp", { message: "ACP cannot be gained at level 20." });
			return;
		}
		const level = form.getValues("level") * 1;
		if (character.total_level + level - selectedLog.level > 20 && level > 0) {
			form.setError("level", { message: "Character cannot exceed level 20." });
			return;
		}

		form.handleSubmit(onSubmit)(e);
	};

	const onSubmit: SubmitHandler<z.infer<typeof logSchema>> = e => {
		form.clearErrors();

		const values = form.getValues();
		values.type = type;
		values.magic_items_gained = magicItemsGained;
		values.magic_items_lost = magicItemsLost;
		values.story_awards_gained = storyAwardsGained;
		values.story_awards_lost = storyAwardsLost;

		const result = logSchema.safeParse(values);
		if (result.success) {
			setSaving(true);
			// ⬇️ This object destructuring is necessary. Otherwise it breaks.
			mutation.mutate({
				...values,
				dm: {
					...values.dm
				}
			});
		} else {
			result.error.issues.forEach(issue => {
				const issueFields = ["date", "name", "dm.name", "description", "characterId", "experience", "acp", "tcp", "level", "gold"] as const;
				if (issueFields.find(i => i == issue.path.join("."))) {
					form.setError(issue.path.join(".") as (typeof issueFields)[number], {
						message: issue.message
					});
				}
				if (issue.path[0] == "magic_items_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
					form.setError(`magic_items_gained.${issue.path[1]}.name`, { message: issue.message });
				}
				if (issue.path[0] == "story_awards_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
					form.setError(`story_awards_gained.${issue.path[1]}.name`, { message: issue.message });
				}
			});
		}
	};

	const magicItems = character
		? getMagicItems(character, { excludeDropped: true, lastLogId: params.logId === "new" ? "" : params.logId }).sort((a, b) => a.name.localeCompare(b.name))
		: [];
	const storyAwards = character
		? getStoryAwards(character, { excludeDropped: true, lastLogId: params.logId === "new" ? "" : params.logId }).sort((a, b) => a.name.localeCompare(b.name))
		: [];
	const addMagicItem = () => setMagicItemsGained([...magicItemsGained, { id: "", name: "", description: "" }]);
	const removeMagicItem = (index: number) => setMagicItemsGained(magicItemsGained.filter((_, i) => i !== index));
	const addLostMagicItem = () => setMagicItemsLost([...magicItemsLost, magicItems[0]?.id || ""]);
	const removeLostMagicItem = (index: number) => setMagicItemsLost(magicItemsLost.filter((_, i) => i !== index));

	const addStoryAward = () => setStoryAwardsGained([...storyAwardsGained, { id: "", name: "", description: "" }]);
	const removeStoryAward = (index: number) => setStoryAwardsGained(storyAwardsGained.filter((_, i) => i !== index));
	const addLostStoryAward = () => setStoryAwardsLost([...storyAwardsLost, storyAwards[0]?.id || ""]);
	const removeLostStoryAward = (index: number) => setStoryAwardsLost(storyAwardsLost.filter((_, i) => i !== index));

	const setDM = (dm: DungeonMaster) => {
		form.setValue("dm.id", dm.id);
		form.setValue("dm.name", dm.name);
		form.setValue("dm.DCI", dm.DCI);
	};

	return (
		<>
			<Head>
				<title>{selectedLog.name ? `Edit Log - ${selectedLog.name}` : "New Log"}</title>
			</Head>

			<div className="breadcrumbs mb-4 text-sm">
				<ul>
					<li>
						<Icon path={mdiHome} className="w-4" />
					</li>
					<li>
						<Link href="/characters" className="text-secondary">
							Characters
						</Link>
					</li>
					<li>
						<Link href={`/characters/${params.characterId}`} className="text-secondary">
							{character.name}
						</Link>
					</li>
					{selectedLog.name ? (
						<li className="overflow-hidden text-ellipsis whitespace-nowrap dark:drop-shadow-md">{selectedLog.name}</li>
					) : (
						<li className="dark:drop-shadow-md">New Log</li>
					)}
				</ul>
			</div>

			{mutError && (
				<div className="alert alert-error shadow-lg">
					<div>
						<Icon path={mdiAlertCircle} size={1} />
						<span>Error! Task failed successfully. I mean... {mutError}</span>
					</div>
				</div>
			)}

			<form onSubmit={submitHandler}>
				<input type="hidden" {...form.register("characterId", { value: params.characterId })} />
				<input type="hidden" {...form.register("logId", { value: params.logId === "new" ? "" : params.logId })} />
				<input type="hidden" {...form.register("is_dm_log", { value: selectedLog.is_dm_log })} />
				<div className="grid grid-cols-12 gap-4">
					{!selectedLog.is_dm_log && (
						<div className="form-control col-span-12 sm:col-span-4">
							<label className="label">
								<span className="label-text">Log Type</span>
							</label>
							<select value={type} onChange={e => setType(e.target.value as LogType)} disabled={saving} className="select-bordered select w-full">
								<option value={"game"}>Game</option>
								<option value={"nongame"}>Non-Game (Purchase, Trade, etc)</option>
							</select>
						</div>
					)}
					<div className={twMerge("form-control col-span-12", selectedLog.is_dm_log ? "sm:col-span-6" : "sm:col-span-4")}>
						<label className="label">
							<span className="label-text">
								Title
								<span className="text-error">*</span>
							</span>
						</label>
						<input
							type="text"
							{...form.register("name", { required: true, value: selectedLog.name, disabled: saving })}
							className="input-bordered input w-full focus:border-primary"
							aria-invalid={form.formState.errors.name ? "true" : "false"}
						/>
						<label className="label">
							<span className="label-text-alt text-error">{form.formState.errors.name?.message}</span>
						</label>
					</div>
					<div className={twMerge("form-control col-span-12", selectedLog.is_dm_log ? "sm:col-span-6" : "sm:col-span-4")}>
						<label className="label">
							<span className="label-text">
								Date
								<span className="text-error">*</span>
							</span>
						</label>
						<input
							type="datetime-local"
							{...form.register("date", {
								required: true,
								value: formatDate(selectedLog.date),
								disabled: saving,
								setValueAs: (v: string) => new Date(v || formatDate(selectedLog.date)).toISOString()
							})}
							className="input-bordered input w-full focus:border-primary"
							aria-invalid={form.formState.errors.date ? "true" : "false"}
						/>
						<label className="label">
							<span className="label-text-alt text-error">{form.formState.errors.date?.message}</span>
						</label>
					</div>
					<div className="col-span-12 grid grid-cols-12 gap-4" ref={parent1}>
						{type === "game" && (
							<>
								<input type="hidden" {...form.register("dm.id", { value: selectedLog.dm?.id || "" })} />
								{selectedLog.is_dm_log ? (
									<>
										<input type="hidden" {...form.register("dm.name", { value: selectedLog.dm?.name || "" })} />
										<input type="hidden" {...form.register("dm.DCI", { value: selectedLog.dm?.DCI || "" })} />
										<input type="hidden" {...form.register("dm.uid", { value: selectedLog.dm?.uid || "" })} />
									</>
								) : (
									<>
										<div className="form-control col-span-12 sm:col-span-6">
											<label className="label">
												<span className="label-text">DM Name</span>
											</label>
											<AutoFillSelect
												type="text"
												inputProps={form.register("dm.name", {
													value: selectedLog.dm?.name || "",
													disabled: saving
												})}
												values={dms?.map(dm => ({ key: dm.name, value: dm.name + (dm.DCI ? ` (${dm.DCI})` : "") })) || []}
												onSelect={val => {
													const dm = dms?.find(dm => dm.name === val);
													if (dm) setDM(dm);
												}}
											/>
											<label className="label">
												<span className="label-text-alt text-error">{form.formState.errors.dm?.name?.message}</span>
											</label>
										</div>
										<div className="form-control col-span-12 sm:col-span-6">
											<label className="label">
												<span className="label-text">DM DCI</span>
											</label>
											<AutoFillSelect
												type="number"
												inputProps={form.register("dm.DCI", {
													value: selectedLog.dm?.DCI || null,
													disabled: saving
												})}
												values={dms?.map(dm => ({ key: dm.DCI, value: dm.name + (dm.DCI ? ` (${dm.DCI})` : "") })) || []}
												onSelect={val => {
													const dm = dms?.find(dm => dm.DCI === val);
													if (dm) setDM(dm);
												}}
											/>
											<label className="label">
												<span className="label-text-alt text-error">{form.formState.errors.dm?.DCI?.message}</span>
											</label>
										</div>
									</>
								)}
								<div className="form-control col-span-12 sm:col-span-4">
									<label className="label">
										<span className="label-text">Season</span>
									</label>
									<select
										value={season}
										onChange={e => setSeason(parseInt(e.target.value) as 1 | 8 | 9)}
										disabled={saving}
										className="select-bordered select w-full">
										<option value={9}>Season 9+</option>
										<option value={8}>Season 8</option>
										<option value={1}>Season 1-7</option>
									</select>
								</div>
								{season === 1 && (
									<div className="form-control col-span-6 w-full sm:col-span-4">
										<label className="label">
											<span className="label-text">Experience</span>
										</label>
										<input
											type="number"
											{...form.register("experience", { value: selectedLog.experience, disabled: saving, valueAsNumber: true })}
											className="input-bordered input w-full focus:border-primary"
										/>
										<label className="label">
											<span className="label-text-alt text-error">{form.formState.errors.experience?.message}</span>
										</label>
									</div>
								)}
								{season === 9 && (
									<div className="form-control col-span-12 w-full sm:col-span-4">
										<label className="label">
											<span className="label-text">Level</span>
										</label>
										<input
											type="number"
											min="0"
											max={Math.max(selectedLog.level, character ? 20 - character.total_level : 19)}
											{...form.register("level", {
												value: selectedLog.level,
												min: 0,
												max: Math.max(selectedLog.level, character ? 20 - character.total_level : 19),
												disabled: saving,
												valueAsNumber: true
											})}
											className="input-bordered input w-full focus:border-primary"
										/>
										<label className="label">
											<span className="label-text-alt text-error">{form.formState.errors.level?.message}</span>
										</label>
									</div>
								)}
							</>
						)}
						{(season === 8 || type === "nongame") && (
							<>
								{type === "game" && (
									<div className="form-control col-span-6 w-full sm:col-span-2">
										<label className="label">
											<span className="label-text">ACP</span>
										</label>
										<input
											type="number"
											{...form.register("acp", { value: selectedLog.acp, disabled: saving, valueAsNumber: true })}
											className="input-bordered input w-full focus:border-primary"
										/>
										<label className="label">
											<span className="label-text-alt text-error">{form.formState.errors.acp?.message}</span>
										</label>
									</div>
								)}
								<div className={twMerge("form-control w-full", type === "nongame" ? "col-span-4" : "col-span-6 sm:col-span-2")}>
									<label className="label">
										<span className="label-text">TCP</span>
									</label>
									<input
										type="number"
										{...form.register("tcp", { value: selectedLog.tcp, disabled: saving, valueAsNumber: true })}
										className="input-bordered input w-full focus:border-primary"
									/>
									<label className="label">
										<span className="label-text-alt text-error">{form.formState.errors.tcp?.message}</span>
									</label>
								</div>
							</>
						)}
						<div className={twMerge("form-control w-full", type === "game" ? "col-span-12 sm:col-span-2" : "col-span-4")}>
							<label className="label">
								<span className="label-text">Gold</span>
							</label>
							<input
								type="number"
								{...form.register("gold", { value: selectedLog.gold, disabled: saving, valueAsNumber: true })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{form.formState.errors.gold?.message}</span>
							</label>
						</div>
						<div className={twMerge("form-control w-full", type === "game" ? "col-span-12 sm:col-span-2" : "col-span-4")}>
							<label className="label">
								<span className="label-text overflow-hidden text-ellipsis whitespace-nowrap">Downtime Days</span>
							</label>
							<input
								type="number"
								{...form.register("dtd", { value: selectedLog.dtd, disabled: saving, valueAsNumber: true })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{form.formState.errors.dtd?.message}</span>
							</label>
						</div>
					</div>
					<div className="form-control col-span-12 w-full">
						<label className="label">
							<span className="label-text">Notes</span>
						</label>
						<AutoResizeTextArea
							{...form.register("description", { value: selectedLog.description || "", disabled: saving })}
							className="textarea-bordered textarea w-full focus:border-primary"
						/>
						<label className="label">
							<span className="label-text-alt text-error">{form.formState.errors.description?.message}</span>
							<span className="label-text-alt">Markdown Allowed</span>
						</label>
					</div>
					<div className="col-span-12 flex flex-wrap gap-4">
						<button type="button" className="btn-primary btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addMagicItem} disabled={saving}>
							Add Magic Item
						</button>
						{!selectedLog.is_dm_log && magicItems.filter(item => !magicItemsLost.includes(item.id)).length > 0 && (
							<button type="button" className="btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addLostMagicItem} disabled={saving}>
								Drop Magic Item
							</button>
						)}
						{type === "game" && (
							<>
								<button type="button" className="btn-primary btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addStoryAward} disabled={saving}>
									Add Story Award
								</button>
								{!selectedLog.is_dm_log && storyAwards.filter(item => !storyAwardsLost.includes(item.id)).length > 0 && (
									<button type="button" className="btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addLostStoryAward} disabled={saving}>
										Drop Story Award
									</button>
								)}
							</>
						)}
					</div>
					<div className="col-span-12 grid grid-cols-12 gap-4" ref={parent2}>
						{magicItemsGained.map((item, index) => (
							<div key={`magicItemsGained${index}`} className="card col-span-12 h-[370px] bg-base-300/70 sm:col-span-6">
								<div className="card-body flex flex-col gap-4">
									<h4 className="text-2xl">Add Magic Item</h4>
									<div className="flex gap-4">
										<div className="form-control flex-1">
											<label className="label">
												<span className="label-text">Name</span>
											</label>
											<input
												type="text"
												value={item.name}
												onChange={e => {
													setMagicItemsGained(magicItemsGained.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)));
												}}
												disabled={saving}
												className="input-bordered input w-full focus:border-primary"
											/>
											<label className="label">
												<span className="label-text-alt text-error">{(form.formState.errors.magic_items_gained || [])[index]?.name?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeMagicItem(index)}>
											<Icon path={mdiTrashCan} size={1} />
										</button>
									</div>
									<div className="form-control w-full">
										<label className="label">
											<span className="label-text">Description</span>
										</label>
										<textarea
											onChange={e => {
												setMagicItemsGained(magicItemsGained.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)));
											}}
											disabled={saving}
											className="textarea-bordered textarea w-full focus:border-primary"
											style={{ resize: "none" }}
											value={item.description}
										/>
										<label className="label">
											<span className="label-text-alt text-error"></span>
											<span className="label-text-alt">Markdown Allowed</span>
										</label>
									</div>
								</div>
							</div>
						))}
						{magicItemsLost.map((id, index) => (
							<div key={`magicItemsLost${index}`} className="card col-span-12 bg-base-300/70 shadow-xl sm:col-span-6">
								<div className="card-body flex flex-col gap-4">
									<h4 className="text-2xl">Drop Magic Item</h4>
									<div className="flex gap-4">
										<div className="form-control flex-1">
											<label className="label">
												<span className="label-text">Select an Item</span>
											</label>
											<select
												value={id}
												onChange={e => {
													setMagicItemsLost(magicItemsLost.map((item, i) => (i === index ? e.target.value : item)));
												}}
												disabled={saving}
												className="select-bordered select w-full">
												{[...selectedLog.magic_items_lost.filter(i => i.id === id), ...magicItems].map(item => (
													<option key={item.id} value={item.id}>
														{item.name}
													</option>
												))}
											</select>
											<label className="label">
												<span className="label-text-alt text-error">{(form.formState.errors.magic_items_lost || [])[index]?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeLostMagicItem(index)}>
											<Icon path={mdiTrashCan} size={1} />
										</button>
									</div>
									<div className="text-sm">{magicItems.find(item => magicItemsLost[index] === item.id)?.description}</div>
								</div>
							</div>
						))}
						{storyAwardsGained.map((item, index) => (
							<div key={`storyAwardsGained${index}`} className="card col-span-12 h-[370px] bg-base-300/70 sm:col-span-6">
								<div className="card-body flex flex-col gap-4">
									<h4 className="text-2xl">Add Story Award</h4>
									<div className="flex gap-4">
										<div className="form-control flex-1">
											<label className="label">
												<span className="label-text">Name</span>
											</label>
											<input
												type="text"
												value={item.name}
												onChange={e => {
													setStoryAwardsGained(storyAwardsGained.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)));
												}}
												disabled={saving}
												className="input-bordered input w-full focus:border-primary"
												style={{ resize: "none" }}
											/>
											<label className="label">
												<span className="label-text-alt text-error">{(form.formState.errors.story_awards_gained || [])[index]?.name?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeStoryAward(index)}>
											<Icon path={mdiTrashCan} size={1} />
										</button>
									</div>
									<div className="form-control w-full">
										<label className="label">
											<span className="label-text">Description</span>
										</label>
										<textarea
											onChange={e => {
												setStoryAwardsGained(storyAwardsGained.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)));
											}}
											disabled={saving}
											className="textarea-bordered textarea w-full focus:border-primary"
											value={item.description}
										/>
										<label className="label">
											<span className="label-text-alt text-error"></span>
											<span className="label-text-alt">Markdown Allowed</span>
										</label>
									</div>
								</div>
							</div>
						))}
						{storyAwardsLost.map((id, index) => (
							<div key={`storyAwardsLost${index}`} className="card col-span-12 bg-base-300/70 shadow-xl sm:col-span-6">
								<div className="card-body flex flex-col gap-4">
									<h4 className="text-2xl">Drop Story Award</h4>
									<div className="flex gap-4">
										<div className="form-control flex-1">
											<label className="label">
												<span className="label-text">Select a Story Award</span>
											</label>
											<select
												value={id}
												onChange={e => {
													setStoryAwardsLost(storyAwardsLost.map((item, i) => (i === index ? e.target.value : item)));
												}}
												className="select-bordered select w-full">
												{[...selectedLog.story_awards_lost.filter(i => i.id === id), ...storyAwards].map(item => (
													<option key={item.id} value={item.id}>
														{item.name}
													</option>
												))}
											</select>
											<label className="label">
												<span className="label-text-alt text-error">{(form.formState.errors.story_awards_lost || [])[index]?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeLostStoryAward(index)}>
											<Icon path={mdiTrashCan} size={1} />
										</button>
									</div>
									<div className="text-sm">{storyAwards.find(item => storyAwardsLost[index] === item.id)?.description}</div>
								</div>
							</div>
						))}
					</div>
					<div className="col-span-12 text-center">
						<button type="submit" className={twMerge("btn-primary btn", saving && "loading")} disabled={saving}>
							Save Log
						</button>
					</div>
				</div>
			</form>
		</>
	);
};

EditLog.getLayout = page => {
	return <Layout>{page}</Layout>;
};

export default EditLog;

export const getMagicItems = (
	character: InferPropsFromServerSideFunction<typeof getServerSideProps>["character"],
	options?: {
		lastLogId?: string;
		excludeDropped?: boolean;
	}
) => {
	const { lastLogId = "", excludeDropped = false } = options || {};
	const magicItems: MagicItem[] = [];
	let lastLog = false;
	character.logs.forEach(log => {
		if (lastLog) return;
		if (log.id === lastLogId) {
			lastLog = true;
			return;
		}
		log.magic_items_gained.forEach(item => {
			magicItems.push(item);
		});
		log.magic_items_lost.forEach(item => {
			magicItems.splice(
				magicItems.findIndex(i => i.id === item.id),
				1
			);
		});
	});
	return magicItems.filter(item => !excludeDropped || !item.logLostId);
};

export const getStoryAwards = (
	character: InferPropsFromServerSideFunction<typeof getServerSideProps>["character"],
	options?: {
		lastLogId?: string;
		excludeDropped?: boolean;
	}
) => {
	const { lastLogId = "", excludeDropped = false } = options || {};
	const storyAwards: MagicItem[] = [];
	let lastLog = false;
	character.logs.forEach(log => {
		if (lastLog) return;
		if (log.id === lastLogId) {
			lastLog = true;
			return;
		}
		log.story_awards_gained.forEach(item => {
			storyAwards.push(item);
		});
		log.story_awards_lost.forEach(item => {
			storyAwards.splice(
				storyAwards.findIndex(i => i.id === item.id),
				1
			);
		});
	});
	return storyAwards.filter(item => !excludeDropped || !item.logLostId);
};
