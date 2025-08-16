import { z, ZodError } from "zod";
type ZodErrorMapFn = Parameters<typeof z.setErrorMap>[0];
// @ts-expect-error Zod type signature mismatch tolerated for robust error mapping
const frErrorMap: ZodErrorMapFn = (issue: any, ctx: any, ..._rest: any[]) => {
  // 1) conserver message custom s’il existe
  if (issue?.message) return { message: issue.message };
  const path = Array.isArray(issue?.path) && issue.path.length ? issue.path.join(".") : "champ";
  const msg = (m: string) => ({ message: m });

  const code = String(issue?.code ?? "");
  switch (code) {
    case "invalid_type": {
      const expected = issue?.expected ?? "valeur";
      const received = issue?.received ?? "inconnue";
      return msg(`Type invalide: attendu ${expected}, reçu ${received}.`);
    }
    case "invalid_literal":
      return msg("Valeur exacte requise.");
    case "invalid_enum_value":
    case "invalid_enum":
    case "invalid_enum_member":
      return msg("Valeur non autorisée.");
    case "invalid_string": {
      const v = issue?.validation;
      if (v === "email") return msg("Email invalide.");
      if (v === "uuid") return msg("UUID invalide.");
      if (v === "url") return msg("URL invalide.");
      return msg("Chaîne invalide.");
    }
    case "too_small": {
      const t = issue?.type;
      const what =
        t === "array" ? "liste" : t === "string" ? "texte" : t === "number" ? "nombre" : path;
      return issue?.inclusive
        ? msg(`${what} trop petit: min ${issue?.minimum}.`)
        : msg(`${what} doit être > ${issue?.minimum}.`);
    }
    case "too_big": {
      const t = issue?.type;
      const what =
        t === "array" ? "liste" : t === "string" ? "texte" : t === "number" ? "nombre" : path;
      return issue?.inclusive
        ? msg(`${what} trop grand: max ${issue?.maximum}.`)
        : msg(`${what} doit être < ${issue?.maximum}.`);
    }
    case "invalid_date":
      return msg("Date invalide.");
    case "not_multiple_of":
      return msg(`Doit être un multiple de ${issue?.multipleOf}.`);
    case "unrecognized_keys":
      return msg("Clé non autorisée.");
    case "custom":
      return msg("Valeur invalide.");
    default:
      return msg("Valeur invalide.");
  }
};

export function setZodErrorMapFR(): void {
  z.setErrorMap(frErrorMap);
}

export function formatZodErrors(error: ZodError) {
  // ZodError has a flatten method for formatting errors
  if ('flatten' in error && typeof error.flatten === "function") {
    return error.flatten();
  }
  
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  
  for (const issue of error.issues) {
    const key = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "";
    const message = issue.message || "Valeur invalide.";
    
    if (key) {
      fieldErrors[key] = fieldErrors[key] || [];
      fieldErrors[key].push(message);
    } else {
      formErrors.push(message);
    }
  }
  return { fieldErrors, formErrors };
}
