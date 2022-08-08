import type { PropsWithChildren } from "react";
import { useRouter } from "next/router";
import { signIn, signOut, useSession } from "next-auth/react";
import background from "../../public/images/barovia-gate.jpg";
import google from "../../public/images/google.svg";
import Image from "next/image";
import Link from "next/link";

const Layout = (props: PropsWithChildren) => {
  const session = useSession();
  const router = useRouter();

  return (
    <>
      <Image src={background} layout="fill" objectFit="cover" objectPosition="center" priority alt="Background" className="relative z-0 opacity-25" />
      <header className="relative z-20 border-b-[1px] border-slate-500 w-screen">
        <nav className="container mx-auto p-4 max-w-5xl flex gap-2">
          <Link href={session.data?.user ? "/characters" : "/"}>
            <a className="flex flex-col font-draconis text-center mr-8">
              <h1 className="text-base leading-4">Adventurers League</h1>
              <h2 className="text-3xl leading-7">Log Sheet</h2>
            </a>
          </Link>
          <div className="flex-1">&nbsp;</div>
          <a href="http://paypal.me/Sillvva" target="_blank" rel="noreferrer noopener" className="p-2 hidden sm:flex items-center">
            Contribute
          </a>
          {session.data?.user ? (
            <>
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="flex cursor-pointer">
                  <div className="px-4 hidden sm:flex items-center text-primary-content">{session.data.user.name}</div>
                  <div className="avatar">
                    <div className="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                      <Image
                        src={session.data.user.image || ""}
                        alt={session.data.user.name as string}
                        layout="fill"
                        objectFit="cover"
                        objectPosition="center"
                        className="rounded-full"
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
        </nav>
      </header>
      <main className="relative z-10 container mx-auto p-4 max-w-5xl">{props.children}</main>
    </>
  );
};

export default Layout;
