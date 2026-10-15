export default function MoneyMapLogo({ dark = false, iconClassName = 'size-10' }) {
  return (
    <span className="inline-flex items-center gap-3" aria-label="MoneyMap">
      <span className={`${iconClassName} grid shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-emerald-300 to-teal-500 shadow-lg shadow-emerald-950/20`}>
        <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className="size-[78%]">
          <circle cx="20" cy="20" r="14" stroke="#052e2b" strokeWidth="2.4" strokeDasharray="14 4" transform="rotate(-30 20 20)" />
          <path d="M20 3v3m0 28v3M3 20h3m28 0h3" stroke="#d1fae5" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="20" r="8" fill="#d1fae5" stroke="#052e2b" strokeWidth="1.8" />
          <text x="20" y="24" textAnchor="middle" fill="#047857" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800">$</text>
        </svg>
      </span>
      <span
        className={`inline-flex items-baseline text-[1.55rem] font-extrabold leading-none tracking-[-0.075em] ${dark ? 'text-slate-900' : 'text-white'}`}
        style={{ fontFamily: '"Segoe UI Variable Display", "Aptos Display", "Trebuchet MS", sans-serif' }}
      >
        <span>Money</span>
        <span className={`relative ml-1 ${dark ? 'text-emerald-600' : 'text-emerald-400'}`}>
          Map
        </span>
      </span>
    </span>
  );
}
