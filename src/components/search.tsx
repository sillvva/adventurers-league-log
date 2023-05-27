export function SearchResults({ text, search }: { text?: string | null; search: string }) {
	if (!text?.trim()) return <></>;
	if (!search || search.length < 2) return <>{text}</>;

	const regex = new RegExp(search, "gi");
	const match = text.match(regex);

	if (!match?.length) return <>{text}</>;

	const parts = text.split(regex);
	for (let i = 1; i < parts.length; i += 2) {
		parts.splice(i, 0, match[(i - 1) / 2] || "");
	}

	return (
		<>
			{parts.map((part, index) =>
				regex.test(part) ? (
					<span key={index} className="bg-secondary px-1 text-black">
						{part}
					</span>
				) : (
					part
				)
			)}
		</>
	);
}
