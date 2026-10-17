import type { Metadata } from "next";
import { GuestbookView } from "@/components/guestbook/guestbook-view";
import { TranslationNotice } from "@/components/translation-notice";
import { labelFor } from "@/content/site/navigation";

export const metadata: Metadata = { title: labelFor("guestbook", "zh") };

export default function GuestbookZhPage() {
  return (
    <div>
      {/* 机翻草稿声明（人工重写本页后删除这一行 + 上面的 import） */}
      <TranslationNotice href="/guestbook" />
      <GuestbookView lang="zh" />
    </div>
  );
}
