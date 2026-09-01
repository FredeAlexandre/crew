import { cn } from "../lib/utils.ts";

export function CrewMark({ className }: { className?: string }) {
	return (
		<div className={cn("grid justify-items-center gap-4 text-center", className)}>
			<svg
				aria-hidden="true"
				className="size-[min(28vw,7.5rem)] drop-shadow-[0_0_1.5rem_color-mix(in_oklch,var(--gold),transparent_55%)]"
				viewBox="0 0 80 80"
			>
				<circle
					cx="40"
					cy="40"
					r="37"
					fill="#0a1218"
					stroke="color-mix(in oklch, var(--gold), white 18%)"
					strokeWidth="2.2"
				/>
				<circle
					cx="40"
					cy="40"
					r="31.5"
					fill="none"
					stroke="color-mix(in oklch, var(--gold), transparent 62%)"
					strokeWidth="1"
				/>
				<circle cx="40" cy="8.5" r="2.4" fill="var(--suit-pink)" />
				<circle cx="71.5" cy="40" r="2.4" fill="var(--suit-yellow)" />
				<circle cx="40" cy="71.5" r="2.4" fill="var(--suit-green)" />
				<circle cx="8.5" cy="40" r="2.4" fill="var(--suit-blue)" />
				<path
					d="M18 44.5c6.5-3.2 14-5 22-5s15.5 1.8 22 5c-2.2-9-10.2-16.5-22-16.5S20.2 35.5 18 44.5Z"
					fill="color-mix(in oklch, var(--gold), white 8%)"
				/>
				<path d="M28 42.5h24l-5.5 7H33.5Z" fill="#0c0b0a" />
				<circle cx="40" cy="38.2" r="3.1" fill="#0c0b0a" />
				<path
					d="M40 22.5v8.5"
					stroke="color-mix(in oklch, var(--gold), white 10%)"
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
			</svg>
			<span className="font-heading text-[clamp(2.4rem,12vw,4.6rem)] leading-none font-semibold tracking-[0.22em] text-balance uppercase">
				Crew
			</span>
		</div>
	);
}
