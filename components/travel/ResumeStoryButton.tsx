"use client";

export default function ResumeStoryButton({ onResume }: { onResume: () => void }) {
  return (
    <button className="resume-story" onClick={onResume}>
      ↩ Resume story
      <style jsx>{`
        .resume-story {
          position: absolute;
          /* v6 (2026-09-26): moved from the map's bottom edge to the TOP
              centre and enlarged (user: "放在地图顶部，且可以做的大一些") —
              the basemap slider keeps the top-right, the date chip the
              top-left, so the centre is free. */
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          border: none;
          background: #ffffff;
          color: #1f2937;
          font-size: 15px;
          font-weight: 500;
          padding: 10px 26px;
          border-radius: 999px;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          z-index: 5;
          transition: background 0.2s ease, transform 0.2s ease,
            box-shadow 0.2s ease;
        }
        .resume-story:hover {
          background: #f0fdfd;
          transform: translateX(-50%) translateY(-1px);
          box-shadow: 0 5px 18px rgba(0, 0, 0, 0.24);
        }
      `}</style>
    </button>
  );
}
