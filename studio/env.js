// Project ID and dataset come from studio/.env (both are public, not secrets).
// Until the owner fills in the real ID, a harmless placeholder keeps build and dev from crashing.
const PLACEHOLDER = 'TODO_PROJECT_ID'

export function readEnv({ projectId, dataset }) {
  const rawId = (projectId || 'l7nho91v').trim() // public Fursat project ID; studio/.env can override
  const isPlaceholder = rawId === PLACEHOLDER
  return {
    isPlaceholder,
    // Sanity only accepts a-z, 0-9 and dashes in a project ID, so the placeholder is normalised.
    projectId: isPlaceholder ? 'todo-project-id' : rawId,
    dataset: (dataset || 'production').trim(),
  }
}
