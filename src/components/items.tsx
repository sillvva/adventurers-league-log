import { concatenate } from "$src/utils/misc";
import type { MagicItem, StoryAward } from "@prisma/client";
import { useState } from "react";

export function Items({ items, title, formatting }: { title?: string; items: (MagicItem | StoryAward)[]; formatting?: boolean }) {
  const [modal, setModal] = useState<{ name: string; description: string; date?: Date } | null>(null);
  return (
    <>
      <div className="flex-1 flex flex-col">
        {title && <h4 className="font-semibold">{title}</h4>}
        <p className="divide-x text-sm print:text-xs whitespace-pre-wrap">
          {items.length
            ? items.map(mi => (
                <span
                  key={mi.id}
                  className="px-2 first:pl-0 whitespace-pre-wrap"
                  onClick={() => mi.description && setModal({ name: mi.name, description: mi.description })}>
                  {formatting && !mi.name.match(/^(\d+x? )?((Potion|Scroll|Spell Scroll|Charm|Elixir)s? of)/) ? <strong className="text-secondary-content/70 print:text-neutral-content">{mi.name}</strong> : mi.name}
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
            <p className="text-xs sm:text-sm pt-4 whitespace-pre-wrap">{modal.description}</p>
          </label>
        )}
      </label>
    </>
  );
}
