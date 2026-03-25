import { registerNotificationHandlers } from "./handlers/notification.handler"
import { registerCacheInvalidationHandlers } from "./handlers/cache-invalidation.handler"
import { registerEmbeddingHandlers } from "./handlers/embedding.handler"
import { registerActivityHandlers } from "./handlers/activity.handler"

let initialized = false

export function initEventHandlers() {
  if (initialized) return
  registerNotificationHandlers()
  registerCacheInvalidationHandlers()
  registerEmbeddingHandlers()
  registerActivityHandlers()
  initialized = true
}
