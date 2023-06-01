import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import { dungeonMasterSchema } from "$src/types/zod-schema";
import { useQueryString } from "$src/utils/hooks";
import { trpc } from "$src/utils/trpc";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment } from "react";
import { useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { mdiHome, mdiPencil, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";

import type { NextPageWithLayout } from "$src/pages/_app";
import type { InferPropsFromServerSideFunction } from "ddal";
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

const EditDM: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = () => {
	const [parent1] = useAutoAnimate<HTMLTableSectionElement>();

	const router = useRouter();
	const {
		register,
		formState: { errors },
		handleSubmit
	} = useForm<z.infer<typeof dungeonMasterSchema>>({
		resolver: zodResolver(dungeonMasterSchema)
	});

	const { data: params, errors: errorMessages } = useQueryString(
		z.object({
			dmId: z.string()
		})
	);

	const client = trpc.useContext();
	const { data: dm, isFetching } = trpc.useQuery(["_dms.getOne", { id: params.dmId }], {
		ssr: true,
		refetchOnWindowFocus: false
	});

	const mutation = trpc.useMutation(["_dms.edit"], {
		onSuccess(data) {
			if (data && dm) {
				client.setQueryData(["_dms.getOne", { id: params.dmId }], {
					...dm,
					...data
				});
				const dms = client.getQueryData(["_dms.getMany"]);
				client.setQueryData(
					["_dms.getMany"],
					(dms || []).map(d => (d.id === params.dmId ? { ...d, ...data } : d))
				);
				router.push(`/dms`);
			}
		},
		onError(error) {
			alert(error.message);
		}
	});

	const deleteDMMutation = trpc.useMutation(["_dms.delete"], {
		onSuccess() {
			client.invalidateQueries(["_dms.getMany"]);
		},
		onError(error) {
			alert(error.message);
		}
	});

	if (errorMessages.length) {
		return (
			<>
				<div className="text-error">Error:</div>
				{errorMessages.map((error, index) => (
					<div key={index}>{error}</div>
				))}
			</>
		);
	}

	if (!dm) {
		return <div>Loading...</div>;
	}

	const submitHandler = handleSubmit(data => {
		mutation.mutate({
			...data
		});
	});

	return (
		<>
			<Head>
				<title>{`Edit Dungeon Master - ${dm.name}`}</title>
			</Head>

			<div className="breadcrumbs mb-4 text-sm">
				<ul>
					<li>
						<Icon path={mdiHome} className="w-4" />
					</li>
					<li>
						<Link href="/dms" className="text-secondary">
							DMs
						</Link>
					</li>
					<li className="dark:drop-shadow-md">Edit {dm.name}</li>
				</ul>
			</div>

			<form onSubmit={submitHandler}>
				<input type="hidden" {...register("id", { value: dm.id })} />
				<div className="flex flex-wrap">
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">
									DM Name
									<span className="text-error">*</span>
								</span>
							</label>
							<input
								type="text"
								{...register("name", { required: true, value: dm.name, disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.name?.message}</span>
							</label>
						</div>
					</div>
					<div className="basis-full px-2 sm:basis-1/2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">DCI</span>
							</label>
							<input
								type="text"
								{...register("DCI", { value: dm.DCI || "", disabled: mutation.isLoading })}
								className="input-bordered input w-full focus:border-primary"
							/>
							<label className="label">
								<span className="label-text-alt text-error">{errors.DCI?.message}</span>
							</label>
						</div>
					</div>
					<div className="m-4 basis-full text-center">
						<button type="submit" className={twMerge("btn-primary btn", mutation.isLoading && "loading")} disabled={mutation.isLoading}>
							Update
						</button>
					</div>
				</div>
			</form>

			<div className="mt-8 flex flex-col gap-4">
				<section>
					<h2 className="mb-2 text-2xl">Logs</h2>
					<div className="w-full overflow-x-auto rounded-lg bg-base-100">
						<table className="table w-full">
							<thead>
								<tr className="bg-base-300">
									<th className="">Date</th>
									<th className="">Adventure</th>
									<th className="">Character</th>
									<th className="print:hidden"></th>
								</tr>
							</thead>
							<tbody ref={parent1}>
								{dm.logs.length == 0 ? (
									isFetching ? (
										<tr>
											<td colSpan={4} className="py-20 text-center">
												Loading...
											</td>
										</tr>
									) : (
										<tr>
											<td colSpan={4} className="py-20 text-center">
												<p className="mb-4">This DM has no logs.</p>
												<button
													className="btn-sm btn bg-red-900"
													onClick={async () => {
														if (!confirm(`Are you sure you want to delete ${dm.name}? This action cannot be reversed.`)) return false;
														deleteDMMutation.mutate({ id: dm.id });
													}}>
													<Icon path={mdiTrashCan} size={0.8} className="mr-2" />
													Delete
												</button>
											</td>
										</tr>
									)
								) : (
									dm.logs
										.sort((a, b) => (a.date > b.date ? 1 : -1))
										.map(log => (
											<Fragment key={log.id}>
												<tr>
													<td>{log.date.toLocaleString()}</td>
													<td>{log.name}</td>
													<td>
														<Link href={`/characters/${log.character?.id}`} className="text-secondary">
															{log.character?.name}
														</Link>
													</td>
													<td className="w-8 print:hidden">
														<div className="flex flex-row justify-center gap-2">
															<Link href={`/characters/${log.character?.id}/log/${log.id}`} className="btn-primary btn-sm btn">
																<Icon path={mdiPencil} size={0.8} />
															</Link>
														</div>
													</td>
												</tr>
											</Fragment>
										))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</>
	);
};

EditDM.getLayout = page => {
	return <Layout>{page}</Layout>;
};

export default EditDM;
