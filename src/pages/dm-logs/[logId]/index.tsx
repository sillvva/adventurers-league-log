import AutoResizeTextArea from "$src/components/textarea";
import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import type { NextPageWithLayout } from "$src/pages/_app";
import { prisma } from "$src/server/db/client";
import { logSchema } from "$src/types/zod-schema";
import { useQueryString } from "$src/utils/hooks";
import { getLogsSummary } from "$src/utils/logs";
import { concatenate, formatDate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiAlertCircle, mdiHome, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import type { Character, LogType } from "@prisma/client";
import { InferPropsFromServerSideFunction } from "ddal";
import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEventHandler, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions);

	type SSRChar = Character & { created_at: string };

	if (!session)
		return {
			props: { session: null, log: null, characters: [] as SSRChar[] },
			redirect: {
				destination: "/",
				permanent: false
			}
		};

	const characters = await prisma.character.findMany({
		where: {
			user: { id: session.user?.id }
		}
	});

	const log = await prisma.log.findFirst({
		where: { id: typeof context.query.logId === "string" ? context.query.logId : "", is_dm_log: true },
		include: { dm: true, magic_items_gained: true, magic_items_lost: true, story_awards_gained: true, story_awards_lost: true }
	});

	if (context.query.logId !== "new" && (!log || log.dm?.uid !== session.user?.id))
		return {
			props: { session, log: null, characters: [] as SSRChar[] },
			redirect: {
				destination: "/dm-logs",
				permanent: false
			}
		};

	return {
		props: {
			session,
			log: log && {
				...log,
				date: log.date.toISOString(),
				created_at: log.created_at.toISOString(),
				applied_date: log.applied_date === null ? null : log.applied_date.toISOString()
			},
			characters: characters.map(character => ({ ...character, created_at: character.created_at.toISOString() })) as SSRChar[]
		}
	};
};

const EditLog: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session, log, characters }) => {
	const router = useRouter();
	const { data: params } = useQueryString(
		z.object({
			logId: z.string()
		})
	);

	const {
		register,
		clearErrors,
		formState: { errors },
		getValues,
		setValue,
		setError
	} = useForm<z.infer<typeof logSchema>>();

	const selectedLog = useMemo(
		() =>
			log
				? {
						...log,
						date: new Date(log.date),
						created_at: new Date(log.created_at),
						applied_date: log.applied_date !== null ? new Date(log.applied_date) : null
				  }
				: {
						characterId: null,
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
							name: session?.user?.name || "",
							DCI: null,
							uid: session?.user?.id || ""
						},
						applied_date: null,
						is_dm_log: true,
						magic_items_gained: [],
						magic_items_lost: [],
						story_awards_gained: [],
						story_awards_lost: []
				  },
		[log, session]
	);

	const [parent1] = useAutoAnimate<HTMLDivElement>();
	const [parent2] = useAutoAnimate<HTMLDivElement>();
	const [charSel, setCharSel] = useState<typeof characters>([]);
	const [season, setSeason] = useState<1 | 8 | 9>(selectedLog?.experience ? 1 : selectedLog?.acp ? 8 : 9);
	const [magicItemsGained, setMagicItemsGained] = useState(
		selectedLog.magic_items_gained.map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
	);
	const [storyAwardsGained, setStoryAwardsGained] = useState(
		(selectedLog?.story_awards_gained || []).map(mi => ({ id: mi.id, name: mi.name, description: mi.description || "" }))
	);
	const [mutError, setMutError] = useState<string | null>(null);

	const getCharSel = (value: string | null) => {
		if (!value) setCharId(null);

		const chars: InferPropsFromServerSideFunction<typeof getServerSideProps>["characters"] = [];
		characters.forEach(character => {
			const match = character.name.toLowerCase().includes((value || "undefined").toLocaleLowerCase());
			if (match) chars.push(character);
		});

		setCharSel(chars);
	};

	const setCharId = (character: (typeof characters)[number] | null) => {
		setValue("characterId", character?.id || "");
		setValue("characterName", character?.name || "");
	};

	const utils = trpc.useContext();
	const mutation = trpc.useMutation(["_logs.save"], {
		async onSuccess(log) {
			if (log && log.characterId) {
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
			}
			router.push(`/dm-logs`);
		},
		onError(err) {
			setMutError(err.message);
		}
	});

	const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault();

		clearErrors();
		let errors = [];

		const values = getValues();

		try {
			values.type = "game";

			if (!values.date) errors.push(setError("date", { message: "Required" }));
			else values.date = new Date(values.date.replace("T", " ")).toISOString();

			if (!values.applied_date) errors.push(setError("applied_date", { message: "Required" }));
			else values.applied_date = new Date(values.applied_date.replace("T", " ")).toISOString();

			if (values.characterName.trim() && !characters.find(c => c.id === values.characterId || c.name === values.characterName.trim()))
				errors.push(setError("characterId", { message: "Character Not Found" }));

			values.characterId = characters.find(c => c.id === values.characterId || c.name === values.characterName.trim())?.id || "";

			if (values.characterId && !values.applied_date) errors.push(setError("applied_date", { message: "Required" }));
			if (values.applied_date && !values.characterId) errors.push(setError("characterId", { message: "Required" }));

			values.dm = {
				id: selectedLog.dm?.id || "",
				DCI: null,
				name: selectedLog.dm?.name || session?.user?.name || "",
				uid: selectedLog.dm?.uid || session?.user?.id || ""
			};

			if (values.experience) values.experience = parseInt(values.experience.toString());
			if (values.acp) values.acp = parseInt(values.acp.toString());
			if (values.tcp) values.tcp = parseInt(values.tcp.toString());
			if (values.level) values.level = parseInt(values.level.toString());
			if (values.gold) values.gold = parseInt(values.gold.toString());
			if (values.dtd) values.dtd = parseInt(values.dtd.toString());
			values.is_dm_log = true;
			values.magic_items_gained = magicItemsGained;
			values.magic_items_lost = [];
			values.story_awards_gained = storyAwardsGained;
			values.story_awards_lost = [];
		} catch (err) {
			console.error(err);
		}

		const result = logSchema.safeParse(values);
		if (result.success) {
			mutation.mutate(values);
		} else {
			result.error.issues.forEach(issue => {
				const issueFields = ["date", "name", "dm.name", "description", "characterId", "experience", "acp", "tcp", "level", "gold"] as const;
				if (issueFields.find(i => i == issue.path.join("."))) {
					setError(issue.path.join(".") as (typeof issueFields)[number], {
						message: issue.message
					});
				}
				if (issue.path[0] == "magic_items_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
					setError(`magic_items_gained.${issue.path[1]}.name`, { message: issue.message });
				}
				if (issue.path[0] == "story_awards_gained" && typeof issue.path[1] == "number" && issue.path[2] == "name") {
					setError(`story_awards_gained.${issue.path[1]}.name`, { message: issue.message });
				}
			});
		}
	};

	const addMagicItem = () => setMagicItemsGained([...magicItemsGained, { id: "", name: "", description: "" }]);
	const removeMagicItem = (index: number) => setMagicItemsGained(magicItemsGained.filter((_, i) => i !== index));

	const addStoryAward = () => setStoryAwardsGained([...storyAwardsGained, { id: "", name: "", description: "" }]);
	const removeStoryAward = (index: number) => setStoryAwardsGained(storyAwardsGained.filter((_, i) => i !== index));

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
						<Link href="/dm-logs" className="text-secondary">
							DM Logs
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

			<form onSubmit={handleSubmit}>
				<input type="hidden" {...register("logId", { value: params.logId === "new" ? "" : params.logId })} />
				<div className="grid grid-cols-12 gap-4">
					<div className={concatenate("form-control col-span-12", selectedLog.is_dm_log ? "sm:col-span-6 lg:col-span-3" : "sm:col-span-4")}>
						<label className="label">
							<span className="label-text">
								Title
								<span className="text-error">*</span>
							</span>
						</label>
						<input
							type="text"
							{...register("name", { required: true, value: selectedLog.name, disabled: mutation.isLoading })}
							className="input-bordered input w-full focus:border-primary"
						/>
						<label className="label">
							<span className="label-text-alt text-error">{errors.name?.message}</span>
						</label>
					</div>
					<div className={concatenate("form-control col-span-12", selectedLog.is_dm_log ? "sm:col-span-6 lg:col-span-3" : "sm:col-span-4")}>
						<label className="label">
							<span className="label-text">
								Date
								<span className="text-error">*</span>
							</span>
						</label>
						<input
							type="datetime-local"
							{...register("date", { required: true, value: formatDate(selectedLog.date), disabled: mutation.isLoading })}
							className="input-bordered input w-full focus:border-primary"
						/>
						<label className="label">
							<span className="label-text-alt text-error">{errors.date?.message}</span>
						</label>
					</div>
					<input type="hidden" {...register("characterId", { value: selectedLog.characterId || "", disabled: mutation.isLoading })} />
					<div className="form-control col-span-12 sm:col-span-6 lg:col-span-3">
						<label className="label">
							<span className="label-text">Assigned Character</span>
						</label>
						<div className="dropdown">
							<label>
								<input
									type="text"
									{...register("characterName", {
										value: characters.find(c => c.id === selectedLog.characterId)?.name || "",
										onChange: e => getCharSel(e.target.value),
										disabled: mutation.isLoading
									})}
									className="input-bordered input w-full focus:border-primary"
								/>
							</label>
							{charSel.length > 0 && (
								<ul className="dropdown-content menu rounded-lg bg-base-100 p-2 shadow">
									{charSel.map(character => (
										<li key={character.id}>
											<a onMouseDown={() => setCharId(character)}>{character.name}</a>
										</li>
									))}
								</ul>
							)}
						</div>
						<label className="label">
							<span className="label-text-alt text-error">{errors.characterId?.message}</span>
						</label>
					</div>
					<div className={concatenate("form-control col-span-12", "sm:col-span-6 lg:col-span-3")}>
						<label className="label">
							<span className="label-text">Assigned Date</span>
						</label>
						<input
							type="datetime-local"
							{...register("applied_date", {
								required: true,
								value: selectedLog.applied_date === null ? null : formatDate(selectedLog.applied_date),
								disabled: mutation.isLoading
							})}
							className="input-bordered input w-full focus:border-primary"
						/>
						<label className="label">
							<span className="label-text-alt text-error">{errors.applied_date?.message}</span>
						</label>
					</div>
					<div className="col-span-12 grid grid-cols-12 gap-4" ref={parent1}>
						<div className="form-control col-span-12 sm:col-span-4">
							<label className="label">
								<span className="label-text">Season</span>
							</label>
							<select
								value={season}
								onChange={e => setSeason(parseInt(e.target.value) as 1 | 8 | 9)}
								disabled={mutation.isLoading}
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
									{...register("experience", { value: selectedLog.experience, disabled: mutation.isLoading })}
									className="input-bordered input w-full focus:border-primary"
								/>
								<label className="label">
									<span className="label-text-alt text-error">{errors.experience?.message}</span>
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
									max="1"
									{...register("level", { value: selectedLog.level, min: 0, max: 1, disabled: mutation.isLoading })}
									className="input-bordered input w-full focus:border-primary"
								/>
								<label className="label">
									<span className="label-text-alt text-error">{errors.level?.message}</span>
								</label>
							</div>
						)}
						{season === 8 && (
							<>
								<div className="form-control col-span-6 w-full sm:col-span-2">
									<label className="label">
										<span className="label-text">ACP</span>
									</label>
									<input
										type="number"
										{...register("acp", { value: selectedLog.acp, disabled: mutation.isLoading })}
										className="input-bordered input w-full focus:border-primary"
									/>
									<label className="label">
										<span className="label-text-alt text-error">{errors.acp?.message}</span>
									</label>
								</div>
								<div className={concatenate("form-control w-full", "col-span-6 sm:col-span-2")}>
									<label className="label">
										<span className="label-text">TCP</span>
									</label>
									<input
										type="number"
										{...register("tcp", { value: selectedLog.tcp, disabled: mutation.isLoading })}
										className="input-bordered input w-full focus:border-primary"
									/>
									<label className="label">
										<span className="label-text-alt text-error">{errors.tcp?.message}</span>
									</label>
								</div>
							</>
						)}
						<div className={concatenate("form-control w-full", "col-span-12 sm:col-span-2")}>
							<label className="label">
								<span className="label-text">Gold</span>
							</label>
							<input
								type="number"
								{...register("gold", { value: selectedLog.gold, disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.gold?.message}</span>
							</label>
						</div>
						<div className={concatenate("form-control w-full", "col-span-12 sm:col-span-2")}>
							<label className="label">
								<span className="label-text overflow-hidden text-ellipsis whitespace-nowrap">Downtime Days</span>
							</label>
							<input
								type="number"
								{...register("dtd", { value: selectedLog.dtd, disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.dtd?.message}</span>
							</label>
						</div>
					</div>
					<div className="form-control col-span-12 w-full">
						<label className="label">
							<span className="label-text">Notes</span>
						</label>
						<AutoResizeTextArea
							{...register("description", { value: selectedLog.description || "", disabled: mutation.isLoading })}
							className="textarea-bordered textarea w-full focus:border-primary"
						/>
						<label className="label">
							<span className="label-text-alt text-error">{errors.description?.message}</span>
							<span className="label-text-alt">Markdown Allowed</span>
						</label>
					</div>
					<div className="col-span-12 flex flex-wrap gap-4">
						<button type="button" className="btn-primary btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addMagicItem} disabled={mutation.isLoading}>
							Add Magic Item
						</button>
						<button type="button" className="btn-primary btn-sm btn min-w-fit flex-1 sm:flex-none" onClick={addStoryAward} disabled={mutation.isLoading}>
							Add Story Award
						</button>
					</div>
					<div className="col-span-12 grid grid-cols-12 gap-4" ref={parent2}>
						{magicItemsGained.map((item, index) => (
							<div key={`magicItemsGained${index}`} className="card col-span-12 h-[338px] bg-base-300/70 sm:col-span-6">
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
												disabled={mutation.isLoading}
												className="input-bordered input w-full focus:border-primary"
											/>
											<label className="label">
												<span className="label-text-alt text-error">{(errors.magic_items_gained || [])[index]?.name?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeMagicItem(index)} disabled={mutation.isLoading}>
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
											disabled={mutation.isLoading}
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
												disabled={mutation.isLoading}
												className="input-bordered input w-full focus:border-primary"
											/>
											<label className="label">
												<span className="label-text-alt text-error">{(errors.story_awards_gained || [])[index]?.name?.message}</span>
											</label>
										</div>
										<button type="button" className="btn-danger btn mt-9" onClick={() => removeStoryAward(index)} disabled={mutation.isLoading}>
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
											disabled={mutation.isLoading}
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
					</div>
					<div className="col-span-12 text-center">
						<button type="submit" className={concatenate("btn-primary btn", mutation.isLoading && "loading")} disabled={mutation.isLoading}>
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
