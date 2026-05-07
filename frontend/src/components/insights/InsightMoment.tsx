interface InsightMomentProps {
  text: string
}

export function InsightMoment({ text }: InsightMomentProps) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ backgroundColor: '#9B6DFF11', borderColor: '#9B6DFF33' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-medium"
          style={{ backgroundColor: '#9B6DFF' }}
        >
          ✦
        </div>
        <p className="text-[15px] text-[#1A1535] leading-relaxed" style={{ color: '#5B3FCC' }}>
          {text}
        </p>
      </div>
    </div>
  )
}
