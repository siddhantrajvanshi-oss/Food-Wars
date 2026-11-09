/**
 * Safe fetch utility that verifies Content-Type is JSON before parsing,
 * preventing 'Unexpected token < in JSON' errors when server or proxy returns HTML.
 */
export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    const cleanSnippet = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    if (!res.ok) {
      throw new Error(cleanSnippet || `Server error (status ${res.status})`);
    }
    throw new Error(`Expected JSON but received HTML/text. Response: ${cleanSnippet}`);
  }

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    throw new Error(errorMsg || `Request failed with status ${res.status}`);
  }

  return data as T;
}
