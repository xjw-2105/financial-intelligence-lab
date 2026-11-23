export function staticAsset(path: string) {
  // The existing Pages repository serves approved static resources from its root.
  const relativePath = import.meta.env.MODE === 'pages' ? path.slice(path.lastIndexOf('/') + 1) : path
  return `${import.meta.env.BASE_URL}${relativePath}`
}
