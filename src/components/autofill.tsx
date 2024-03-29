import { useCallback, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

import type { DetailedHTMLProps, InputHTMLAttributes } from "react";

export default function AutoFillSelect({
	type,
	values,
	inputProps,
	onSelect,
	searchBy = "key"
}: {
	type: "text" | "number";
	values: { key?: string | number | null; value: string }[];
	inputProps: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
	onSelect: (value: string | number) => void;
	searchBy?: "key" | "value";
}) {
	const [keySel, setKeySel] = useState<number>(0);
	const [valSearch, setValSearch] = useState("");
	const [selected, setSelected] = useState(false);

	const parsedValues = useMemo(() => values.map(v => ({ key: v.key ?? v.value, value: v.value })).filter(v => v.key !== null), [values]);

	const matches = useMemo(
		() =>
			parsedValues && parsedValues.length > 0 && valSearch.trim()
				? parsedValues
						.filter(v => `${searchBy == "key" ? v.key : v.value}`.toLowerCase().includes(valSearch.toLowerCase()))
						.sort((a, b) => (a.value > b.value ? 1 : -1))
				: [],
		[parsedValues, valSearch, searchBy]
	);

	const selectHandler = useCallback(
		(key: number) => {
			const match = matches[key];
			onSelect(match?.key || "");
			setKeySel(match ? key : 0);
			setSelected(!!match);
			setValSearch("");
		},
		[matches, onSelect]
	);

	return (
		<div className="dropdown">
			<label>
				<input
					type={type}
					{...inputProps}
					onChange={e => {
						setSelected(false);
						setValSearch(e.target.value);
						setKeySel(0);
						if (inputProps.onChange) inputProps.onChange(e);
					}}
					onKeyDown={e => {
						if (!parsedValues.length || !valSearch.trim()) return;
						if (e.code === "ArrowDown") {
							e.preventDefault();
							if (selected) return false;
							setKeySel(keySel + 1);
							if (keySel >= matches.length) setKeySel(0);
							return false;
						}
						if (e.code === "ArrowUp") {
							e.preventDefault();
							if (selected) return false;
							setKeySel(keySel - 1);
							if (keySel < 0) setKeySel(matches.length - 1);
							return false;
						}
						if (e.code === "Enter" || e.code === "Tab") {
							e.preventDefault();
							if (selected) return false;
							selectHandler(keySel);
							return false;
						}
						if (e.code === "Escape") {
							e.preventDefault();
							if (selected) return false;
							selectHandler(-1);
							return false;
						}
					}}
					onBlur={e => {
						if (!selected) selectHandler(matches.findIndex(v => v.key.toString().toLowerCase() === e.target.value.toLowerCase()));
						if (inputProps.onBlur) inputProps.onBlur(e);
					}}
					className="input-bordered input w-full focus:border-primary"
				/>
			</label>
			{parsedValues && parsedValues.length > 0 && valSearch.trim() && !selected && (
				<ul className="dropdown-content menu w-full rounded-lg bg-base-100 p-2 shadow dark:bg-base-200">
					{matches
						.map((kv, i) => (
							<li key={`${kv.key}${i}`} className={twMerge("hover:bg-primary/50", keySel === i && "bg-primary text-primary-content")}>
								<a className="rounded-none px-4 py-2" onMouseDown={() => selectHandler(i)}>
									{kv.value}
								</a>
							</li>
						))
						.slice(0, 8)}
				</ul>
			)}
		</div>
	);
}
