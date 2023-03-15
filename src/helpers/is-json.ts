export function isJson (valor: string) {
  try {
    JSON.parse(valor);
  } catch (erro) {
    return false;
  }

  return true;
}
