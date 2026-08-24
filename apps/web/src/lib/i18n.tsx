import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Locale = "en" | "fr" | "es";

const STORAGE_KEY = "crew.locale";

const messages = {
	en: {
		language: "Language",
		table: "Table",
		name: "Name",
		yourName: "Your name",
		players: "Players",
		createLobby: "Create a lobby",
		openTable: "Open a table and share the link.",
		create: "Create lobby",
		joinLobby: "Join a lobby",
		pasteCode: "Paste the code or the lobby link.",
		join: "Join lobby",
	},
	fr: {
		language: "Langue",
		table: "Table",
		name: "Nom",
		yourName: "Votre nom",
		players: "Joueurs",
		createLobby: "Créer une table",
		openTable: "Ouvrez une table et partagez le lien.",
		create: "Créer la table",
		joinLobby: "Rejoindre une table",
		pasteCode: "Collez le code ou le lien de la table.",
		join: "Rejoindre",
	},
	es: {
		language: "Idioma",
		table: "Mesa",
		name: "Nombre",
		yourName: "Tu nombre",
		players: "Jugadores",
		createLobby: "Crear una mesa",
		openTable: "Abre una mesa y comparte el enlace.",
		create: "Crear mesa",
		joinLobby: "Unirse a una mesa",
		pasteCode: "Pega el código o el enlace de la mesa.",
		join: "Unirse",
	},
} as const;

type MessageKey = keyof (typeof messages)["en"];
type I18n = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string };
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocale] = useState<Locale>(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		return saved === "fr" || saved === "es" || saved === "en" ? saved : "fr";
	});
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, locale);
		document.documentElement.lang = locale;
	}, [locale]);
	return (
		<I18nContext.Provider value={{ locale, setLocale, t: (key) => messages[locale][key] }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n(): I18n {
	const value = useContext(I18nContext);
	if (value === null) throw new Error("useI18n must be used inside I18nProvider");
	return value;
}
