import Layout from "$src/layouts/main";
import { trpc } from "$src/utils/trpc";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { mdiPencil, mdiTrashCan } from "@mdi/js";
import Icon from "@mdi/react";
import { InferPropsFromServerSideFunction } from "ddal";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import Head from "next/head";
import Link from "next/link";
import { Fragment } from "react";
import { authOptions } from "../api/auth/[...nextauth]";
import { NextPageWithLayout } from "../_app";

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

const DMs: NextPageWithLayout<InferPropsFromServerSideFunction<typeof getServerSideProps>> = ({ session }) => {
	const [parent1] = useAutoAnimate<HTMLTableSectionElement>();

	const utils = trpc.useContext();
	const { data: dms, isFetching } = trpc.useQuery(["_dms.getDMs"], {
		refetchOnWindowFocus: false
	});
	const deleteDMMutation = trpc.useMutation(["_dms.delete"], {
		onSuccess() {
			utils.invalidateQueries(["_dms.getDMs"]);
		}
	});

	return (
		<>
			<Head>
				<title>DMs</title>
			</Head>

			<div className="flex flex-col gap-4">
				<section>
					<div className="rounded-lg">
						<table className="table w-full">
							<thead>
								<tr>
									<th className="">Name</th>
									<th className="">DCI</th>
									<th className="">Logs</th>
									<th className="print:hidden"></th>
								</tr>
							</thead>
							<tbody ref={parent1}>
								{!dms || dms.length == 0 ? (
									isFetching ? (
										<tr>
											<td colSpan={3} className="py-20 text-center">
												Loading...
											</td>
										</tr>
									) : (
										<tr>
											<td colSpan={3} className="py-20 text-center">
												<p className="mb-4">You have no DMs.</p>
											</td>
										</tr>
									)
								) : (
									dms
										.sort((a, b) => (a.name > b.name ? 1 : -1))
										.filter(dm => dm.name != session?.user?.name)
										.map(dm => (
											<Fragment key={dm.id}>
												<tr>
													<td>{dm.name}</td>
													<td>{dm.DCI}</td>
													<td>{dm._count.logs}</td>
													<td className="w-16 print:hidden">
														<div className="flex flex-row justify-center gap-2">
															{/* <Link href={`/dms/${dm.id}`} className="btn-primary btn-sm btn">
																<Icon path={mdiPencil} size={0.8} />
															</Link> */}
															{dm._count.logs == 0 && (
																<button
																	className="btn-sm btn"
																	onClick={async () => {
																		if (!confirm(`Are you sure you want to delete ${dm.name}? This action cannot be reversed.`)) return false;
																		deleteDMMutation.mutate({ id: dm.id });
																	}}>
																	<Icon path={mdiTrashCan} size={0.8} />
																</button>
															)}
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

DMs.getLayout = page => {
	return <Layout>{page}</Layout>;
};

export default DMs;
