import { useId } from "react";
import { type Locale, useI18n } from "../lib/i18n.tsx";
import { cn } from "../lib/utils.ts";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select.tsx";

const LOCALES: { id: Locale; name: string }[] = [
	{ id: "fr", name: "Français" },
	{ id: "es", name: "Español" },
	{ id: "en", name: "English" },
];

export function LanguageFlag() {
	const { locale, setLocale, t } = useI18n();
	return (
		<Select
			aria-label={t("language")}
			selectedKey={locale}
			onSelectionChange={(key) => {
				if (key === "fr" || key === "es" || key === "en") {
					setLocale(key);
				}
			}}
		>
			<SelectTrigger
				size="sm"
				className="h-11 w-11 shrink-0 justify-center overflow-hidden rounded-full border-0 p-0 ring-1 ring-muted-foreground/50 hover:bg-foreground/5 hover:ring-foreground/40 data-[size=sm]:h-11 [&>svg:last-child]:hidden"
			>
				<FlagIcon locale={locale} className="size-8" />
			</SelectTrigger>
			<SelectContent className="min-w-44">
				{LOCALES.map((item) => (
					<SelectItem key={item.id} id={item.id} textValue={item.name}>
						<span className="flex items-center gap-2.5">
							<FlagIcon
								locale={item.id}
								className="size-5 rounded-[2px] ring-1 ring-foreground/20"
							/>
							{item.name}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function FlagIcon({ locale, className }: { locale: Locale; className?: string }) {
	const clipId = useId();
	if (locale === "fr") {
		return (
			<svg
				viewBox="0 0 3 2"
				preserveAspectRatio="xMidYMid slice"
				className={cn("block", className)}
				aria-hidden="true"
			>
				<rect width="1" height="2" fill="#002395" />
				<rect x="1" width="1" height="2" fill="#fff" />
				<rect x="2" width="1" height="2" fill="#ed2939" />
			</svg>
		);
	}
	if (locale === "es") {
		return (
			<svg
				viewBox="0 0 3 2"
				preserveAspectRatio="xMidYMid slice"
				className={cn("block", className)}
				aria-hidden="true"
			>
				<rect width="3" height="2" fill="#aa151b" />
				<rect y="0.5" width="3" height="1" fill="#f1bf00" />
			</svg>
		);
	}
	return (
		<svg
			viewBox="0 0 60 30"
			preserveAspectRatio="xMidYMid slice"
			className={cn("block", className)}
			aria-hidden="true"
		>
			<defs>
				<clipPath id={clipId}>
					<path d="M0 0h60v30H0z" />
				</clipPath>
			</defs>
			<g clipPath={`url(#${clipId})`}>
				<rect width="60" height="30" fill="#012169" />
				<path d="m0 0 60 30M60 0 0 30" stroke="#fff" strokeWidth="6" />
				<path d="m0 0 60 30M60 0 0 30" stroke="#c8102e" strokeWidth="4" />
				<path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
				<path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
			</g>
		</svg>
	);
}
