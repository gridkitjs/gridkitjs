/**
 * Saves `blob` as a file named `fileName` — the browser's own download, as a
 * link with a `download` attribute starts one, so nothing is opened or
 * navigated to.
 *
 * The link is put in the document for the click, as Firefox has needed, and
 * taken out straight after. Its object URL is revoked a task later rather
 * than at once: Safari starts the download from the URL after the click
 * returns, and a URL revoked synchronously is gone before it does.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
