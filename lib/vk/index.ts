export { VKBotService } from "./service";
export { VKClient } from "./client";
export {
  getVkRecipients,
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
  type NotificationResult,
} from "./notifications";
export { verifyVkSignature, verifySignature } from "./utils";

export type { VKMessage, VKEvent, BonusNotification } from "./types";
