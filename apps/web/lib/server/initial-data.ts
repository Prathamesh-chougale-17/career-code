export async function loadInitialData<T>(
  label: string,
  loader: () => Promise<T>,
) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[initial-data] Could not load ${label}.`, error);
    return undefined;
  }
}
