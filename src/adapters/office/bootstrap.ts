/** Waits until Office.js is ready in the shared runtime. The composition root calls nothing else in Office. */
export async function startOfficeHost(): Promise<void> {
  await Office.onReady();
}
