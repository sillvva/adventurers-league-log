import { concatenate } from "$src/utils/misc";
import { mdiMenu } from "@mdi/js";
import Icon from "@mdi/react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/future/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { PropsWithChildren, useState } from "react";
import background from "../../public/images/barovia-gate.jpg";
import google from "../../public/images/google.svg";

const Layout = (props: PropsWithChildren) => {
  const session = useSession();
  const router = useRouter();

  const [drawer, setDrawer] = useState(false);

  return (
    <>
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
