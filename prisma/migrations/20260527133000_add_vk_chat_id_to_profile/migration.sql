-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "vk_chat_id" BIGINT;

-- CreateIndex
CREATE INDEX "profiles_vk_chat_id_idx" ON "profiles"("vk_chat_id");