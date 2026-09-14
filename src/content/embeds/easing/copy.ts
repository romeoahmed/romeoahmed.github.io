export const copy = {
  en: {
    timeProgress: "Elapsed time (%)",
    easingValue: "Ease-out progress",
    linear: "Linear",
    easeOut: "Ease-out",
    playMotion: "Play both",
    easingDescription:
      "Both markers take 720 ms to cross the track. Play them together, or use the slider to look at a single moment.",
    easingStatic:
      "At halfway through the time, the linear marker has travelled 50% of the distance; the eased marker, 87.5%.",
  },
  "zh-hans": {
    timeProgress: "经过的时间（%）",
    easingValue: "缓出进度",
    linear: "匀速",
    easeOut: "缓出",
    playMotion: "播放对比",
    easingDescription:
      "两个方块都用 720 毫秒走完轨道。一起播放，看它们如何抵达；也可以拖动滑块，停在某一刻。",
    easingStatic:
      "时间过半时，匀速方块走完了 50% 的路程，缓出方块走完了 87.5%。",
  },
} as const;
