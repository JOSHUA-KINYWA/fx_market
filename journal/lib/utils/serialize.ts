/**
 * Serializes data to plain objects to avoid read-only issues
 * when passing Supabase data from server components to client components
 */
export function serializeData<T>(data: T): T {
  // Use structuredClone if available (Node.js 17+), otherwise fall back to JSON
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(data);
    } catch {
      // Fallback to JSON if structuredClone fails
      return JSON.parse(JSON.stringify(data)) as T;
    }
  }
  return JSON.parse(JSON.stringify(data)) as T;
}

/**
 * Serializes an array of data objects
 */
export function serializeArray<T>(data: T[]): T[] {
  return data.map(item => serializeData(item));
}



