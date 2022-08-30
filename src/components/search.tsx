import { ReactNode } from "react";

export function SearchResults({ text, search }: { text?: string | null; search: string }) {
	if (!text?.trim()) return <></>;
	if (!search) return <>{text}</>;
	const items = text.split(new RegExp(search.trim(), "i"));
	const joined: (string | ReactNode)[] = [];
	items.forEach((item, i) => {
		joined.push(item);
		if (i < items.length - 1) {
			joined.push(
				<span key={i} className="bg-accent px-1 text-black">
					{search}
				</span>
			);
		}
	});
	return <>{joined}</>;
}
