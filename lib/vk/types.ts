/**
 * VK Bot types and interfaces
 */

export interface VKCallbackMessage {
  user_id: number;
  peer_id: number;
  conversation_message_id: number;
  timestamp: number;
  message_id: number;
  text: string;
  important: boolean;
  payload?: string;
  attachments: Record<string, unknown>[];
  from_id: number;
}

export interface VKMessage {
  message: string;
  user_id?: number;
  peer_id?: number;
  random_id?: number;
  keyboard?: VKKeyboard;
}

export interface VKKeyboard {
  one_time: boolean;
  inline: boolean;
  buttons: VKButton[][];
}

export interface VKButton {
  action: {
    type: "text" | "open_link" | "location" | "vkpay" | "open_app";
    label: string;
    payload?: string;
    link?: string;
  };
  color?: "primary" | "secondary" | "negative" | "positive";
}

export interface VKEvent {
  type: string;
  object: Record<string, unknown>;
  group_id: number;
  event_id: string;
}

export interface BonusNotification {
  type: "shift_created" | "bonus_calculated" | "bonus_reset" | "daily_report";
  adminName: string;
  branchName: string;
  shiftId?: string;
  bonusAmount?: number;
  needsReset?: boolean;
  message: string;
}
