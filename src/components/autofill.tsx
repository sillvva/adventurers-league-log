import { concatenate } from "$src/utils/misc";
import { on } from "events";
import { useCallback, useMemo, useState } from "react";

import type { DetailedHTMLProps, InputHTMLAttributes } from "react";

export default function AutoFillSelect({
	type,
	value,
	values,
	inputProps,
	onSelect,
	searchBy = "key"
}: {
	type: "text" | "number";
	value?: string | null;
	values: { key?: string | null; value: string }[];
	inputProps: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
	onSelect: (value: string) => void;
	searchBy?: "key" | "value";
}) {
	const [keySel, setKeySel] = useState<number>(0);
	const [valSearch, setValSearch] = useState("");

	const matches = useMemo(
		() =>
			values && values.length > 0 && valSearch.trim()
				? values
						.filter(v => `${searchBy == "key" ? v.key : v.value}`.toLowerCase().includes(valSearch.toLowerCase()))
						.sort((a, b) => (a.value > b.value ? 1 : -1))
				: [],
		[values, valSearch, searchBy]
	);

	const parsedValues = useMemo(() => values.map(v => ({ key: v.key ?? v.value, value: v.value })).filter(v => v.key !== null), [values]);

	const selectHandler = useCallback(
		(key: number) => {
			setValSearch("");
			onSelect(matches[key]?.key || "");
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
						setValSearch(e.target.value);
						if (inputProps.onChange) inputProps.onChange(e);
					}}
					onKeyDown={e => {
						const isSearching = parsedValues && parsedValues.length > 0 && valSearch.trim();
						if (!isSearching) return false;
						const isSelected = matches.length === 1 && matches[0]?.key === value;
						if (e.code === "ArrowDown") {
							e.preventDefault();
							if (isSelected) return false;
							setKeySel(keySel + 1);
							if (keySel >= matches.length) setKeySel(0);
							return false;
						}
						if (e.code === "ArrowUp") {
							e.preventDefault();
							if (isSelected) return false;
							setKeySel(keySel - 1);
							if (keySel < 0) setKeySel(matches.length - 1);
							return false;
						}
						if (e.code === "Enter" || e.code === "Tab") {
							e.preventDefault();
							if (isSelected) return false;
							selectHandler(keySel);
							setValSearch("");
							return false;
						}
					}}
					onBlur={e => setKeySel(-1)}
					className="input-bordered input w-full focus:border-primary"
				/>
			</label>
			{parsedValues && parsedValues.length > 0 && valSearch.trim() && !(matches.length === 1 && matches[0]?.key === value) && (
				<ul className="dropdown-content menu w-full rounded-lg bg-base-100 p-2 shadow dark:bg-base-200">
					{matches
						.map((kv, i) => (
							<li key={kv.key} className={concatenate(keySel === i && "bg-primary text-primary-content")}>
								<a onMouseDown={() => selectHandler(keySel)}>{kv.value}</a>
							</li>
						))
						.slice(0, 8)}
				</ul>
			)}
		</div>
	);
}
