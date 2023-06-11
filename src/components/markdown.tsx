import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";

import type { SpecialComponents } from "react-markdown/lib/ast-to-react";
import type { NormalComponents } from "react-markdown/lib/complex-types";

export const components: Partial<Omit<NormalComponents, keyof SpecialComponents> & SpecialComponents> = {
	h1({ children }) {
		return <h1 className="text-3xl font-bold">{children}</h1>;
	},
	h2({ children }) {
		return <h2 className="text-2xl font-bold">{children}</h2>;
	},
	h3({ children }) {
		return <h3 className="text-xl font-semibold">{children}</h3>;
	},
	table({ children }) {
		return <table className="table-compact table">{children}</table>;
	},
	th({ children }) {
		return <th className="whitespace-pre-wrap bg-base-200 print:p-2">{children}</th>;
	},
	td({ children }) {
		return <td className="whitespace-pre-wrap print:p-2">{children}</td>;
	},
	a({ children, href }) {
		return (
			<a href={href} className="overflow-hidden text-ellipsis text-secondary" target="_blank" rel="noreferrer noopener">
				{children}
			</a>
		);
	},
	p({ children }) {
		return <p className="mb-2 overflow-hidden text-ellipsis">{children}</p>;
	}
};

export function Markdown({ children, className }: { children: string; className?: string }) {
	return (
		<ReactMarkdown className={className} remarkPlugins={[remarkGfm]} components={components}>
			{children}
		</ReactMarkdown>
	);
}
