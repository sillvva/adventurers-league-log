import { concatenate } from "$src/utils/misc";
import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import Icon from "@mdi/react";
import type { MagicItem, StoryAward } from "@prisma/client";
import { useState } from "react";
import { SearchResults } from "./search";

export function Items({
	items,
	title,
	formatting,
	search,
	collapsible
}: {
	title?: string;
	items: (MagicItem | StoryAward)[];
	formatting?: boolean;
	search?: string;
	collapsible?: boolean;
}) {
	const [modal, setModal] = useState<{ name: string; description: string; date?: Date } | null>(null);
	const [collapsed, setCollapsed] = useState(collapsible);

	return (
		<>
			<div className="flex flex-1 flex-col">
				{title && (
					<h4 className="flex font-semibold" onClick={collapsible ? () => setCollapsed(!collapsed) : () => {}}>
						<span className="flex-1">{title}</span>
						{collapsible && <Icon path={collapsed ? mdiChevronDown : mdiChevronUp} className="ml-2 w-4 justify-self-end inline md:hidden print:hidden" />}
					</h4>
				)}
				<p className={concatenate("divide-x whitespace-pre-wrap text-sm print:text-xs", collapsed ? 'hidden md:block print:block' : '')}>
					{items.length
						? items.map(mi => (
								<span
									key={mi.id}
									className="whitespace-pre-wrap px-2 first:pl-0"
									onClick={() => mi.description && setModal({ name: mi.name, description: mi.description })}>
									{formatting && !mi.name.match(/^(\d+x? )?((Potion|Scroll|Spell Scroll|Charm|Elixir)s? of)/) ? (
										<strong className="text-secondary-content/70 print:text-neutral-content">
											<SearchResults text={mi.name} search={search || ""} />
										</strong>
									) : (
										<SearchResults text={mi.name} search={search || ""} />
									)}
									{mi.description && "*"}
								</span>
							))
						: "None"}
				</p>
			</div>
			<label className={concatenate("modal cursor-pointer", modal && "modal-open")} onClick={() => setModal(null)}>
				{modal && (
					<label className="modal-box relative">
						<h3 className="text-lg font-bold text-accent-content">{modal.name}</h3>
						{modal.date && <p className="text-xs">{modal.date.toLocaleString()}</p>}
						<p className="whitespace-pre-wrap pt-4 text-xs sm:text-sm">{modal.description}</p>
					</label>
				)}
			</label>
		</>
	);
}
