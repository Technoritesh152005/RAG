import redis from '../../lib/redis.js'

export async function invalidateWorkspaceCache(workspaceId) {
  if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    throw new TypeError('A workspace ID is required to invalidate its cache.')
  }

  try {
    await Promise.all([
      redis.del(
        `semantic-cache:vec:${workspaceId}`,
        `semantic-cache:data:${workspaceId}`,
        `semantic-cache:lru:${workspaceId}`,
      ),
      deleteWorkspaceKeys(`embcache:${workspaceId}:`),
      deleteWorkspaceKeys(`contrcache:${workspaceId}:`),
    ])

    console.info(`Workspace caches invalidated for ${workspaceId}`)
  } catch (err) {
    console.error(`Cache invalidation failed for workspace ${workspaceId}:`, err.message)
    throw err
  }
}

async function deleteWorkspaceKeys(prefix) {
  let cursor = '0'
  do {
    const [nextCursor, scannedKeys] = await redis.scan(
      cursor,
      'MATCH',
      `${prefix.split(':', 1)[0]}:*`,
      'COUNT',
      100,
    )
    cursor = nextCursor
    const keys = scannedKeys.filter((key) => key.startsWith(prefix))
    if (keys.length > 0) await redis.del(...keys)
  } while (cursor !== '0')
}