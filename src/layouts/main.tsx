import { concatenate } from "$src/utils/misc";
import { mdiGithub, mdiMenu } from "@mdi/js";
import Icon from "@mdi/react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/future/image";
import Head from "next/head";
import Link from "next/link";
import Router, { useRouter } from "next/router";
import * as NProgress from "nprogress";
import { PropsWithChildren, useEffect, useState } from "react";
import background from "../../public/images/barovia-gate.jpg";
import google from "../../public/images/google.svg";

const Layout = (props: PropsWithChildren) => {
	const session = useSession();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [drawer, setDrawer] = useState(false);

	useEffect(() => {
		const mm = matchMedia("(prefers-color-scheme: dark)");
		const listener = () => setTheme(mm.matches ? "dark" : "light");

		console.log(theme);

		if (!theme || theme == "system") listener();
		mm.addEventListener("change", listener);
		return () => mm.removeEventListener("change", listener);
	}, [theme, setTheme]);

	return (
		<>
			<Head>
				<link rel="icon" type="image/x-icon" href="/favicon.png" />
				<meta property="og:type" content="website" />
				<meta property="og:url" content={`https://ddal.dekok.app${router.asPath}`} />
				<meta property="twitter:card" content="summary_large_image" />
				<meta property="twitter:url" content={`https://ddal.dekok.app${router.asPath}`} />
				{!["/characters/[characterId]"].includes(router.route) && (
					<>
						<meta name="title" content="Adventurers League Log" />
						<meta name="description" content="An online log sheet made for Adventurers League characters" />
						<meta property="og:title" content="Adventurers League Log" />
						<meta property="og:description" content={"An online log sheet made for Adventurers League characters"} />
						<meta property="og:image" content={"https://ddal.dekok.app/images/barovia-gate.jpg"} />
						<meta property="twitter:title" content="Adventurers League Log" />
						<meta property="twitter:description" content={"An online log sheet made for Adventurers League characters"} />
						<meta property="twitter:image" content={"https://ddal.dekok.app/images/barovia-gate.jpg"} />
					</>
				)}
			</Head>
			<NextNProgress color="#6518e7" height={3} options={{ showSpinner: false }} />
			<Image
				src={background}
				alt="Background"
				priority
				fill
				className="!fixed z-0 min-h-screen min-w-full object-cover object-center opacity-25 dark:opacity-20 print:hidden"
			/>
			<div className="flex min-h-screen flex-col">
				<header className="relative z-20 w-full border-b-[1px] border-slate-500">
					<nav className="container mx-auto flex max-w-5xl gap-2 p-4">
						<button className="flex py-3 pr-4 print:hidden md:hidden" onClick={() => setDrawer(true)}>
							<Icon path={mdiMenu} size={1} />
						</button>
						<Link href={session.data?.user ? "/characters" : "/"} className="mr-8 flex flex-col text-center font-draconis">
							<h1 className="text-base leading-4 text-accent-content">Adventurers League</h1>
							<h2 className="text-3xl leading-7">Log Sheet</h2>
						</Link>
						<Link href="/characters" className="hidden items-center p-2 md:flex">
							Character Logs
						</Link>
						<Link href="/dm-logs" className="hidden items-center p-2 md:flex">
							DM Logs
						</Link>
						<div className="flex-1">&nbsp;</div>
						{session.status !== "loading" && (
							<>
								<a
									href="https://github.com/sillvva/adventurers-league-log"
									target="_blank"
									rel="noreferrer noopener"
									className="hidden items-center p-2 sm:flex">
									<Icon path={mdiGithub} size={1} />
								</a>
								<a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener" className="hidden items-center p-2 sm:flex">
									Contribute
								</a>
								{session.data?.user ? (
									<>
										<div className="dropdown-end dropdown">
											<label tabIndex={0} className="flex cursor-pointer">
												<div className="hidden items-center px-4 text-accent-content print:flex sm:flex">{session.data.user.name}</div>
												<div className="avatar">
													<div className="relative w-11 overflow-hidden rounded-full ring ring-primary ring-offset-2 ring-offset-base-100">
														<Image
															src={session.data.user.image || ""}
															alt={session.data.user.name as string}
															width={48}
															height={48}
															className="rounded-full object-cover object-center"
														/>
													</div>
												</div>
											</label>
											<ul tabIndex={0} className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow">
												<li className="sm:hidden">
													<a>{session.data.user.name}</a>
												</li>
												<li>
													<a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener" className="items-center sm:hidden">
														Contribute
													</a>
												</li>
												<li>
													<a
														href="https://github.com/sillvva/adventurers-league-log"
														target="_blank"
														rel="noreferrer noopener"
														className="items-center sm:hidden">
														Github
													</a>
												</li>
												<li>
													<a onClick={() => signOut()}>Logout</a>
												</li>
											</ul>
										</div>
									</>
								) : (
									<>
										<button
											className="flex h-12 items-center gap-2 rounded-lg bg-base-200/50 p-2 text-base-content transition-colors hover:bg-base-300"
											onClick={() =>
												signIn("google", {
													callbackUrl: `${router.basePath}/characters`
												})
											}>
											<Image src={google} width={24} height={24} alt="Google" />
											<span className="flex h-full flex-1 items-center justify-center font-semibold">Login</span>
										</button>
									</>
								)}
							</>
						)}
					</nav>
				</header>
				<main className="container relative z-10 mx-auto max-w-5xl flex-1 p-4">{props.children}</main>
				<footer className="z-16 footer footer-center relative bg-base-300/50 p-4 text-base-content print:hidden">
					<div>
						<p>
							All{" "}
							<a
								href="https://www.dndbeyond.com/sources/cos/the-lands-of-barovia#BGatesofBarovia"
								target="_blank"
								rel="noreferrer noopener"
								className="text-secondary">
								images
							</a>{" "}
							and the name{" "}
							<a href="https://dnd.wizards.com/adventurers-league" target="_blank" rel="noreferrer noopener" className="text-secondary">
								Adventurers League
							</a>{" "}
							are property of Hasbro and{" "}
							<a href="https://dnd.wizards.com/adventurers-league" target="_blank" rel="noreferrer noopener" className="text-secondary">
								Wizards of the Coast
							</a>
							. This website is affiliated with neither.
						</p>
					</div>
				</footer>
				<div className={concatenate("fixed top-0 bottom-0 -left-72 z-50 w-72 bg-neutral py-4 px-4 transition-all", drawer && "left-0")}>
					<ul className="menu w-full" onClick={() => setDrawer(false)}>
						<li>
							<Link href="/characters">Character Logs</Link>
						</li>
						<li>
							<Link href="/dm-logs">DM Logs</Link>
						</li>
					</ul>
					<div className="divider"></div>
					<ul className="menu w-full">
						<li>
							<a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener">
								Contribute
							</a>
						</li>
					</ul>
				</div>
				<div
					className={concatenate("fixed inset-0 bg-black/50 transition-all", drawer ? "z-40 opacity-100" : "-z-10 opacity-0")}
					onClick={() => setDrawer(false)}
				/>
			</div>
		</>
	);
};

export default Layout;

type NProgress = {
	/**
	 * The color of the bar.
	 * @default "#29D"
	 */
	color?: string;
	/**
	 * The start position of the bar.
	 * @default 0.3
	 */
	startPosition?: number;
	/**
	 * The stop delay in milliseconds.
	 * @default 200
	 */
	stopDelayMs?: number;
	/**
	 * The height of the bar.
	 * @default 3
	 */
	height?: number;
	/**
	 * Whether to show the bar on shallow routes.
	 * @default true
	 */
	showOnShallow?: boolean;
	/**
	 * The other NProgress configuration options to pass to NProgress.
	 * @default null
	 */
	options?: Partial<NProgress.NProgressOptions>;
	/**
	 * The nonce attribute to use for the `style` tag.
	 * @default undefined
	 */
	nonce?: string;
};

function NextNProgress({
	color = "#29D",
	startPosition = 0.3,
	stopDelayMs = 200,
	height = 3,
	showOnShallow = true,
	options,
	nonce
}: NProgress) {
	useEffect(() => {
		let timer: NodeJS.Timeout | null = null;

		if (options) {
			NProgress.configure(options);
		}

		const routeChangeStart = (_: string, { shallow }: { shallow: boolean }) => {
			if (!shallow || showOnShallow) {
				NProgress.set(startPosition);
				NProgress.start();
			}
		};

		const routeChangeEnd = (_: string, { shallow }: { shallow: boolean }) => {
			if (!shallow || showOnShallow) {
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					NProgress.done(true);
				}, stopDelayMs);
			}
		};

		Router.events.on("routeChangeStart", routeChangeStart);
		Router.events.on("routeChangeComplete", routeChangeEnd);
		Router.events.on("routeChangeError", routeChangeEnd);

		return () => {
			if (timer) clearTimeout(timer);
			NProgress.done(true);
			Router.events.off("routeChangeStart", routeChangeStart);
			Router.events.off("routeChangeComplete", routeChangeEnd);
			Router.events.off("routeChangeError", routeChangeEnd);
		};
	}, [options, showOnShallow, startPosition, stopDelayMs]);

	return (
		<style nonce={nonce}>{`
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: ${color};
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: ${height}px;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
        opacity: 1;
        -webkit-transform: rotate(3deg) translate(0px, -4px);
        -ms-transform: rotate(3deg) translate(0px, -4px);
        transform: rotate(3deg) translate(0px, -4px);
      }
      #nprogress .spinner {
        display: block;
        position: fixed;
        z-index: 1031;
        top: 15px;
        right: 15px;
      }
      #nprogress .spinner-icon {
        width: 18px;
        height: 18px;
        box-sizing: border-box;
        border: solid 2px transparent;
        border-top-color: ${color};
        border-left-color: ${color};
        border-radius: 50%;
        -webkit-animation: nprogresss-spinner 400ms linear infinite;
        animation: nprogress-spinner 400ms linear infinite;
      }
      .nprogress-custom-parent {
        overflow: hidden;
        position: relative;
      }
      .nprogress-custom-parent #nprogress .spinner,
      .nprogress-custom-parent #nprogress .bar {
        position: absolute;
      }
      @-webkit-keyframes nprogress-spinner {
        0% {
          -webkit-transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
        }
      }
      @keyframes nprogress-spinner {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `}</style>
	);
}
