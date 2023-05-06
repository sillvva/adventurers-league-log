import Layout from "$src/layouts/main";
import { authOptions } from "$src/pages/api/auth/[...nextauth]";
import type { NextPageWithLayout } from "$src/pages/_app";
import { dungeonMasterSchema } from "$src/types/zod-schema";
import { useQueryString } from "$src/utils/hooks";
import { concatenate } from "$src/utils/misc";
import { trpc } from "$src/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { mdiHome } from "@mdi/js";
import Icon from "@mdi/react";
import type { InferPropsFromServerSideFunction } from "ddal";
import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const EditDM: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session }) => {
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
	const { data: dm } = trpc.useQuery(["_dms.getOne", { id: params.dmId }], {
		ssr: true,
		refetchOnWindowFocus: false
	});

	const mutation = trpc.useMutation(["_dms.edit"], {
		onSuccess(data) {
			if (data) {
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
						<button type="submit" className={concatenate("btn-primary btn", mutation.isLoading && "loading")} disabled={mutation.isLoading}>
							Update
						</button>
					</div>
				</div>
			</form>
		</>
	);
};

EditDM.getLayout = page => {
	return <Layout>{page}</Layout>;
};

export default EditDM;
