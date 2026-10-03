export const APP_NAME = "Tarefas";
export const SITE_URL = "https://tarefas.grok.me";
export const APP_TITLE = "Tarefas — lista do que fazer hoje";
export const APP_DESCRIPTION =
  "Organize o que precisa ser feito hoje. Lista pessoal, com dia marcado, agenda e o que já foi concluído.";

export const APP_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  url: SITE_URL,
  description: APP_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
}).replace(/</g, "\\u003c");

