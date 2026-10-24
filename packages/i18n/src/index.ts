export type SupportedLocale = "en" | "hi" | "ar" | "es" | "fr" | "de" | "pt";
export const rtlLocales: SupportedLocale[] = ["ar"];
export const directionFor = (locale: SupportedLocale) => rtlLocales.includes(locale) ? "rtl" : "ltr";
export const formatMoney = (minor: number, currency: string, locale: SupportedLocale) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
export const messages = {
  en: { pass: "The Pass", welcome: "Welcome to Mise", empty: "Your service day starts here.", saved: "Saved on this device" },
  hi: { pass: "द पास", welcome: "Mise में आपका स्वागत है", empty: "आपका सेवा दिवस यहाँ से शुरू होता है।", saved: "इस डिवाइस पर सहेजा गया" },
  ar: { pass: "الممر", welcome: "مرحبًا بك في Mise", empty: "يبدأ يوم خدمتك هنا.", saved: "تم الحفظ على هذا الجهاز" }
} as const;
