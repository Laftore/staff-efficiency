import { z } from "zod";

export const inventoryItemSchema = z.object({
  productName: z.string().min(1),
  fact: z.coerce.number().int().min(0),
});

export const inventorySaveSchema = z.object({
  shiftId: z.string().min(1),
  items: z.array(inventoryItemSchema).min(1),
});
