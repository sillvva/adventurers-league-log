import { concatenate } from "$src/utils/misc";
import { mdiGithub, mdiMenu } from "@mdi/js";
import Icon from "@mdi/react";
import { signIn, signOut, useSession } from "next-auth/react";
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

  const [drawer, setDrawer] = useState(false);

  return (
    <>
      <Head>
        <link rel="icon" type="image/x-icon" href="/favicon.png" />
      </Head>
			<NextNProgress color="#6518e7" height={2} options={{ showSpinner: false }} />
      <Image
        src={background}
        priority
        alt="Background"
        width={1280}
        height={1080}
        className="!fixed z-0 min-w-full min-h-screen object-cover object-center opacity-20 print:hidden"
      />
      <div className="flex flex-col min-h-screen">
        <header className="relative z-20 border-b-[1px] border-slate-500 w-full">
          <nav className="container mx-auto p-4 max-w-5xl flex gap-2">
            <button className="py-3 pr-4 flex md:hidden print:hidden" onClick={() => setDrawer(true)}>
              <Icon path={mdiMenu} size={1} />
            </button>
            <Link href={session.data?.user ? "/characters" : "/"}>
              <a className="flex flex-col font-draconis text-center mr-8">
                <h1 className="text-base leading-4 text-primary-content">Adventurers League</h1>
                <h2 className="text-3xl leading-7">Log Sheet</h2>
              </a>
            </Link>
            <Link href="/characters">
              <a className="p-2 hidden md:flex items-center">Character Logs</a>
            </Link>
            <Link href="/dm-logs">
              <a className="p-2 hidden md:flex items-center">DM Logs</a>
            </Link>
            <div className="flex-1">&nbsp;</div>
            {session.status !== "loading" && (
              <>
                <a href="https://github.com/sillvva/adventurers-league-log" target="_blank" rel="noreferrer noopener" className="p-2 hidden sm:flex items-center">
                  <Icon path={mdiGithub} size={1} />
                </a>
                <a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener" className="p-2 hidden sm:flex items-center">
                  Contribute
                </a>
                {session.data?.user ? (
                  <>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="flex cursor-pointer">
                        <div className="px-4 hidden sm:flex print:flex items-center text-primary-content">{session.data.user.name}</div>
                        <div className="avatar">
                          <div className="w-12 relative rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
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
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li className="sm:hidden">
                          <a>{session.data.user.name}</a>
                        </li>
                        <li>
                          <a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener" className="sm:hidden items-center">
                            Contribute
                          </a>
                        </li>
                        <li>
                          <a href="https://github.com/sillvva/adventurers-league-log" target="_blank" rel="noreferrer noopener" className="sm:hidden items-center">
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
                      className="flex items-center bg-neutral/50 hover:bg-neutral text-neutral-content hover:text-primary-content transition-colors rounded-lg gap-2 p-2 h-12"
                      onClick={() =>
                        signIn("google", {
                          callbackUrl: `${router.basePath}/characters`
                        })
                      }>
                      <Image src={google} width={24} height={24} alt="Google" />
                      <span className="flex-1 flex h-full justify-center items-center font-semibold">Login</span>
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
        </header>
        <main className="container flex-1 relative z-10 mx-auto p-4 max-w-5xl">{props.children}</main>
        <footer className="footer footer-center relative z-16 p-4 bg-base-300/50 text-base-content print:hidden">
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
        <div className={concatenate("fixed z-50 top-0 bottom-0 -left-72 w-72 bg-neutral py-4 px-4 transition-all", drawer && "left-0")}>
          <ul className="menu w-full" onClick={() => setDrawer(false)}>
            <li>
              <Link href="/characters">
                <a>Character Logs</a>
              </Link>
            </li>
            <li>
              <Link href="/dm-logs">
                <a>DM Logs</a>
              </Link>
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

function NextNProgress({ color = "#29D", startPosition = 0.3, stopDelayMs = 200, height = 3, showOnShallow = true, options, nonce }: NProgress) {
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
