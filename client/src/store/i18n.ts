import { createI18nContext } from "@solid-primitives/i18n";

const context = createI18nContext(
	{
		en: {
			//word template -> Word
			Home: "Home",
			Editor: "Editor",
			About: "About",
			Start: "Start",
			Left: "Left",
			Right: "Right",
			//word template -> word
			page: "page",
			typing: "typing",
			here: "here",
		},
		de: {
			//word template -> Word
			Home: "Startseite",
			Editor: "Editor",
			About: "Über",
			Start: "Start",
			Left: "Links",
			Right: "Rechts",
			//word template -> word
			page: "seite",
			typing: "tippen",
			here: "hier",
		},
	},
	"en",
); // Set 'en' as the default language.

export default { context };
