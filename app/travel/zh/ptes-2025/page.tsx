import type { Metadata } from "next";
import TravelLog from "@/components/travel/TravelLog";

export const metadata: Metadata = { title: "伊比利亚 2025 — 葡萄牙 · 西班牙 · 圣诞" };

export default function Ptes2025ZhPage() {
  return (
    <>
      {/* 首帧即沉浸（2026-09-26）：TravelLog 的 body.tl-immersive 在水合
          effect 里才挂上，静态导出的 HTML 里站点 chrome 可见——不加这段
          解析期即执行的内联脚本，进入时会闪现一帧导航条。 */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(document.body){document.body.classList.add("tl-immersive");'
            + 'if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)'
            + 'document.body.classList.add("tl-veil-boot");}}catch(e){}',
        }}
      />
      {/*
        v11 入场幕布（2026-09-28）：tl-veil-boot 通过 body::before 伪元素画
        幕布（样式在 globals.css）。加类与 tl-immersive 同款、hydration 安全
        ——首帧前 append 真实 DOM 节点会打爆 React 19 hydration（#418 → 客户端
        重渲染 → 节点被删，v11 诊断探针实测）。TravelLog 在数据与地图就绪后加
        .tl-veil-open，收幕动画结束自动移除两个类。
      */}
      <TravelLog tripId="ptes-2025" backHref="/travel/zh" backLabel="返回旅行志" />
    </>
  );
}
