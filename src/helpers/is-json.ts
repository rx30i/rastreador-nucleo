export function isJson(valor: string) {
  try {
    JSON.parse(valor);
  } catch (_erro) {
    return false;
  }

  return true;
}
