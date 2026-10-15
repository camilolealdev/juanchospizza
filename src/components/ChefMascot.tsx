import React from 'react';

interface ChefMascotProps {
  selectedFlavors: string[];
  flavorIcons: Record<string, string>;
  flavorNames: string[];
  sizeLabel?: string;
}

const SLICE_COLORS = ['#C62828', '#F4A924', '#4C7A3D'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

const ChefMascot: React.FC<ChefMascotProps> = ({ selectedFlavors, flavorIcons, flavorNames }) => {
  const flavorIds = Array.from(selectedFlavors);
  const peelCx = 200;
  const peelCy = 320;
  const pizzaR = 88;

  return (
    <svg viewBox="0 0 400 520" className="w-full h-full drop-shadow-2xl">
      <defs>
        <radialGradient id="face-gradient" cx="45%" cy="35%">
          <stop offset="0%" stopColor="#E0B88A" />
          <stop offset="50%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#C49158" />
        </radialGradient>
        <radialGradient id="mc-crust">
          <stop offset="0%" stopColor="#F5DEB3" />
          <stop offset="70%" stopColor="#D2B48C" />
          <stop offset="100%" stopColor="#C49A6C" />
        </radialGradient>
        <radialGradient id="mc-cheese">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#FFE082" />
        </radialGradient>
        <linearGradient id="peel-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A67C52" />
          <stop offset="50%" stopColor="#8B6340" />
          <stop offset="100%" stopColor="#7A5535" />
        </linearGradient>
        <linearGradient id="peel-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9A6B45" />
          <stop offset="50%" stopColor="#8B6340" />
          <stop offset="100%" stopColor="#7A5535" />
        </linearGradient>
        <linearGradient id="overalls-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A8DE8" />
          <stop offset="100%" stopColor="#3B7DD8" />
        </linearGradient>
        <linearGradient id="shirt-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4DCF0" />
          <stop offset="100%" stopColor="#A8C8E0" />
        </linearGradient>
        <linearGradient id="hat-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0E8DC" />
        </linearGradient>
        <linearGradient id="glove-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B6340" />
          <stop offset="100%" stopColor="#6B4C30" />
        </linearGradient>
        <radialGradient id="cheek-rosy" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#F8A090" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F8A090" stopOpacity="0" />
        </radialGradient>
        <filter id="chef-glow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#F4A924" floodOpacity="0.15" />
        </filter>
        <filter id="peel-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.25" />
        </filter>
        <filter id="sparkle-blur">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
        <filter id="head-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.12" />
        </filter>
      </defs>

      <style>{`
        .chef-bob {
          animation: chef-bob 3s ease-in-out infinite;
        }
        @keyframes chef-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .float-slice {
          animation: float-slice 4s ease-in-out infinite;
        }
        .float-slice-1 { animation-duration: 4s; animation-delay: 0s; }
        .float-slice-2 { animation-duration: 5s; animation-delay: 0.5s; }
        .float-slice-3 { animation-duration: 3.5s; animation-delay: 1s; }
        .float-slice-4 { animation-duration: 4.5s; animation-delay: 1.5s; }
        @keyframes float-slice {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .sparkle-pulse {
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        .sparkle-pulse-1 { animation-delay: 0s; }
        .sparkle-pulse-2 { animation-delay: 0.4s; }
        .sparkle-pulse-3 { animation-delay: 0.8s; }
        .sparkle-pulse-4 { animation-delay: 1.2s; }
        .sparkle-pulse-5 { animation-delay: 1.6s; }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Floating pizza slices */}
      <g>
        <text x="25" y="50" fontSize="24" opacity="0.18" className="float-slice float-slice-1">
          🍕
        </text>
        <text x="350" y="60" fontSize="18" opacity="0.14" className="float-slice float-slice-2">
          🍕
        </text>
        <text x="15" y="440" fontSize="16" opacity="0.1" className="float-slice float-slice-3">
          🍕
        </text>
        <text x="365" y="400" fontSize="20" opacity="0.15" className="float-slice float-slice-4">
          🍕
        </text>
      </g>

      {/* Sparkles */}
      <g filter="url(#sparkle-blur)">
        <text x="45" y="110" fontSize="14" className="sparkle-pulse sparkle-pulse-1">
          ✨
        </text>
        <text x="345" y="130" fontSize="11" className="sparkle-pulse sparkle-pulse-2">
          ✨
        </text>
        <text x="35" y="320" fontSize="12" className="sparkle-pulse sparkle-pulse-3">
          ✨
        </text>
        <text x="360" y="310" fontSize="10" className="sparkle-pulse sparkle-pulse-4">
          ⭐
        </text>
        <text x="60" y="220" fontSize="9" className="sparkle-pulse sparkle-pulse-5">
          ✨
        </text>
      </g>

      {/* ═══════════ CHEF GROUP WITH BOB ═══════════ */}
      <g className="chef-bob" style={{ transformOrigin: '200px 260px', transform: 'scale(1.08)' }}>
        {/* ═══════════ LEGS ═══════════ */}
        <g>
          <rect x="158" y="380" width="28" height="65" rx="12" fill="#2C5F8A" />
          <rect x="160" y="380" width="2" height="63" rx="1" fill="#4A8DE8" opacity="0.25" />
          <rect x="184" y="380" width="2" height="63" rx="1" fill="#1E3F5C" opacity="0.15" />
          <rect x="214" y="380" width="28" height="65" rx="12" fill="#2C5F8A" />
          <rect x="216" y="380" width="2" height="63" rx="1" fill="#4A8DE8" opacity="0.25" />
          <rect x="240" y="380" width="2" height="63" rx="1" fill="#1E3F5C" opacity="0.15" />
          {/* Shoes */}
          <ellipse cx="172" cy="447" rx="22" ry="11" fill="#3D2B1F" />
          <ellipse cx="228" cy="447" rx="22" ry="11" fill="#3D2B1F" />
          <ellipse cx="168" cy="445" rx="7" ry="3" fill="#5C4033" opacity="0.45" />
          <ellipse cx="224" cy="445" rx="7" ry="3" fill="#5C4033" opacity="0.45" />
          <rect x="153" y="451" width="38" height="4" rx="2" fill="#2A1E15" opacity="0.3" />
          <rect x="209" y="451" width="38" height="4" rx="2" fill="#2A1E15" opacity="0.3" />
        </g>

        {/* ═══════════ OVERALLS ═══════════ */}
        <g filter="url(#chef-glow)">
          <path
            d="M140 290 Q140 270 162 262 L238 262 Q260 270 260 290 L260 390 Q260 402 248 402 L152 402 Q140 402 140 390 Z"
            fill="url(#overalls-gradient)"
          />
          {/* Golden double stitching */}
          <path
            d="M144 292 Q144 274 164 266 L236 266 Q256 274 256 292 L256 388 Q256 398 246 398 L154 398 Q144 398 144 388 Z"
            fill="none"
            stroke="#D4A040"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.45"
          />
          {/* Overall straps */}
          <path
            d="M162 262 L168 222 Q170 214 178 214 L222 214 Q230 214 232 222 L238 262"
            fill="none"
            stroke="url(#overalls-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Brass hardware */}
          <circle cx="165" cy="262" r="5" fill="#D4A040" stroke="#B8862D" strokeWidth="1" />
          <circle cx="165" cy="262" r="2.5" fill="#E8C060" />
          <circle cx="235" cy="262" r="5" fill="#D4A040" stroke="#B8862D" strokeWidth="1" />
          <circle cx="235" cy="262" r="2.5" fill="#E8C060" />
          {/* Central chest pocket */}
          <rect x="172" y="305" width="56" height="42" rx="6" fill="#2C5F8A" />
          <rect
            x="175"
            y="308"
            width="50"
            height="36"
            rx="4"
            fill="none"
            stroke="#D4A040"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.35"
          />
          {/* Circular patch */}
          <circle cx="200" cy="326" r="16" fill="#F5DEB3" />
          <circle cx="200" cy="326" r="15" fill="none" stroke="#D4A040" strokeWidth="1.5" />
          <circle cx="200" cy="326" r="13" fill="none" stroke="#D4A040" strokeWidth="0.5" />
          <circle cx="200" cy="323" r="6" fill="#FFE082" opacity="0.6" />
          <path d="M200 317 L194 329 L206 329 Z" fill="#C62828" opacity="0.35" />
          <circle cx="198" cy="324" r="1" fill="#C62828" opacity="0.5" />
          <circle cx="202" cy="322" r="0.8" fill="#4C7A3D" opacity="0.5" />
          <path id="patch-text-path" d="M186 338 Q200 346 214 338" fill="none" />
          <text fontSize="3.8" fill="#3D2B1F" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.5">
            <textPath href="#patch-text-path" startOffset="50%" textAnchor="middle">
              JUANCHO&apos;S PIZZA
            </textPath>
          </text>
        </g>

        {/* ═══════════ SHIRT ═══════════ */}
        <g>
          <rect x="128" y="225" width="144" height="80" rx="16" fill="url(#shirt-gradient)" />
          <rect x="145" y="210" width="110" height="25" rx="8" fill="url(#shirt-gradient)" />
          <rect x="183" y="200" width="34" height="26" rx="8" fill="#D4A574" />

          {/* Shirt buttons */}
          <circle cx="200" cy="230" r="2" fill="#E8E0D4" stroke="#C4B8A8" strokeWidth="0.5" />
          <circle cx="200" cy="245" r="2" fill="#E8E0D4" stroke="#C4B8A8" strokeWidth="0.5" />
          <circle cx="200" cy="260" r="2" fill="#E8E0D4" stroke="#C4B8A8" strokeWidth="0.5" />
          {/* Shirt pocket */}
          <rect
            x="210"
            y="232"
            width="18"
            height="14"
            rx="2"
            fill="none"
            stroke="#94B8D0"
            strokeWidth="0.8"
            opacity="0.4"
          />

          {/* Neckerchief - red and white gingham */}
          <path d="M170 225 L200 252 L230 225" fill="#C62828" />
          <path d="M176 225 L200 246 L224 225" fill="#E53935" />
          {/* Gingham checks */}
          <rect x="184" y="228" width="5" height="5" fill="white" opacity="0.5" rx="0.5" />
          <rect x="194" y="228" width="5" height="5" fill="white" opacity="0.5" rx="0.5" />
          <rect x="204" y="228" width="5" height="5" fill="white" opacity="0.5" rx="0.5" />
          <rect x="189" y="234" width="5" height="5" fill="white" opacity="0.45" rx="0.5" />
          <rect x="199" y="234" width="5" height="5" fill="white" opacity="0.45" rx="0.5" />
          <rect x="194" y="240" width="5" height="5" fill="white" opacity="0.4" rx="0.5" />
          <rect x="179" y="228" width="5" height="5" fill="#D22020" opacity="0.3" rx="0.5" />
          <rect x="199" y="228" width="5" height="5" fill="#D22020" opacity="0.3" rx="0.5" />
          <rect x="184" y="234" width="5" height="5" fill="#D22020" opacity="0.3" rx="0.5" />
          <rect x="204" y="234" width="5" height="5" fill="#D22020" opacity="0.3" rx="0.5" />
          <rect x="189" y="240" width="5" height="5" fill="#D22020" opacity="0.3" rx="0.5" />
          {/* Knot */}
          <circle cx="200" cy="248" r="5" fill="#B71C1C" />
          <circle cx="200" cy="248" r="3" fill="#D32F2F" />

          {/* Left arm */}
          <path
            d="M128 242 Q100 268 92 305 Q88 320 96 328"
            fill="none"
            stroke="url(#shirt-gradient)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          {/* Left glove with fingers gripping peel */}
          <ellipse cx="92" cy="330" rx="18" ry="15" fill="url(#glove-gradient)" />
          {/* Fingers wrapping around handle */}
          <path
            d="M80 324 Q74 320 72 326 Q70 332 76 336 Q82 338 86 334"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          <path
            d="M78 332 Q72 330 70 336 Q70 342 76 344 Q82 344 86 340"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          <path
            d="M80 338 Q76 340 74 344 Q74 350 80 350 Q86 348 88 344"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          {/* Thumb */}
          <path d="M100 322 Q106 318 108 324 Q108 330 102 332" fill="#7A5535" stroke="#5C4033" strokeWidth="1" />
          {/* Glove stitching */}
          <path
            d="M84 328 Q92 336 104 330"
            fill="none"
            stroke="#D4A040"
            strokeWidth="0.7"
            strokeDasharray="2 2"
            opacity="0.6"
          />
          <path
            d="M86 322 Q90 318 98 320"
            fill="none"
            stroke="#D4A040"
            strokeWidth="0.5"
            strokeDasharray="1.5 2"
            opacity="0.4"
          />
          {/* Knuckle creases */}
          <path d="M76 326 Q78 324 80 326" fill="none" stroke="#5C4033" strokeWidth="0.5" opacity="0.4" />
          <path d="M74 334 Q76 332 78 334" fill="none" stroke="#5C4033" strokeWidth="0.5" opacity="0.4" />

          {/* Right arm */}
          <path
            d="M272 242 Q300 268 308 300 Q312 315 304 322"
            fill="none"
            stroke="url(#shirt-gradient)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          {/* Right glove with fingers gripping peel */}
          <ellipse cx="308" cy="324" rx="18" ry="15" fill="url(#glove-gradient)" />
          {/* Fingers wrapping around handle */}
          <path
            d="M320 318 Q326 314 328 320 Q330 326 324 330 Q318 332 314 328"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          <path
            d="M322 326 Q328 324 330 330 Q330 336 324 338 Q318 338 314 334"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          <path
            d="M320 334 Q324 336 326 340 Q326 346 320 346 Q314 344 312 340"
            fill="#7A5535"
            stroke="#5C4033"
            strokeWidth="1"
          />
          {/* Thumb */}
          <path d="M300 316 Q294 312 292 318 Q292 324 298 326" fill="#7A5535" stroke="#5C4033" strokeWidth="1" />
          {/* Glove stitching */}
          <path
            d="M316 322 Q308 330 296 324"
            fill="none"
            stroke="#D4A040"
            strokeWidth="0.7"
            strokeDasharray="2 2"
            opacity="0.6"
          />
          <path
            d="M314 316 Q310 312 302 314"
            fill="none"
            stroke="#D4A040"
            strokeWidth="0.5"
            strokeDasharray="1.5 2"
            opacity="0.4"
          />
          {/* Knuckle creases */}
          <path d="M324 320 Q322 318 320 320" fill="none" stroke="#5C4033" strokeWidth="0.5" opacity="0.4" />
          <path d="M326 328 Q324 326 322 328" fill="none" stroke="#5C4033" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* ═══════════ PIZZA PEEL ═══════════ */}
        <g filter="url(#peel-shadow)">
          {/* Handle */}
          <rect
            x="290"
            y="268"
            width="10"
            height="125"
            rx="5"
            fill="url(#peel-handle)"
            transform="rotate(12 295 330)"
          />
          <ellipse
            cx="310"
            cy="348"
            rx="6"
            ry="3"
            fill="none"
            stroke="#5C4033"
            strokeWidth="1"
            opacity="0.3"
            transform="rotate(12 310 348)"
          />
          <ellipse
            cx="314"
            cy="358"
            rx="6"
            ry="3"
            fill="none"
            stroke="#5C4033"
            strokeWidth="1"
            opacity="0.3"
            transform="rotate(12 314 358)"
          />

          {/* Board */}
          <ellipse cx={peelCx} cy={peelCy} rx="108" ry="100" fill="url(#peel-wood)" />
          <ellipse cx={peelCx} cy={peelCy} rx="104" ry="96" fill="#9A6B45" opacity="0.2" />
          <ellipse
            cx={peelCx}
            cy={peelCy}
            rx="96"
            ry="88"
            fill="none"
            stroke="#7A5535"
            strokeWidth="0.4"
            opacity="0.15"
          />

          {/* Pizza */}
          <circle cx={peelCx} cy={peelCy} r={pizzaR + 5} fill="#8B572A" />
          <circle cx={peelCx} cy={peelCy} r={pizzaR + 5} fill="none" stroke="#6D3F1A" strokeWidth={1.2} />
          <circle cx={peelCx} cy={peelCy} r={pizzaR} fill="url(#mc-crust)" />
          <circle cx={peelCx} cy={peelCy} r={pizzaR - 6} fill="url(#mc-cheese)" opacity={0.9} />

          {flavorIds.length > 0 && <circle cx={peelCx} cy={peelCy} r={pizzaR - 10} fill="#C62828" opacity={0.1} />}

          {/* Empty state */}
          {flavorIds.length === 0 && (
            <g>
              <text
                x={peelCx}
                y={peelCy - 6}
                textAnchor="middle"
                fill="#8B572A"
                fontSize="9"
                fontWeight="700"
                opacity="0.7"
                fontFamily="sans-serif"
              >
                ¡Empieza a elegir!
              </text>
              <text x={peelCx} y={peelCy + 16} textAnchor="middle" fontSize="22" opacity="0.5">
                🍕
              </text>
            </g>
          )}

          {/* 1 flavor */}
          {flavorIds.length === 1 && (
            <>
              <circle cx={peelCx} cy={peelCy} r={pizzaR - 6} fill={SLICE_COLORS[0]} opacity={0.25} />
              {flavorIcons[flavorIds[0]] && (
                <text
                  x={peelCx}
                  y={peelCy + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="26"
                  opacity={0.85}
                >
                  {flavorIcons[flavorIds[0]]}
                </text>
              )}
            </>
          )}

          {/* 2 flavors */}
          {flavorIds.length === 2 &&
            flavorIds.map((fId, i) => {
              const flavor = flavorNames[i];
              const sliceAngle = 360 / 2;
              const startAngle = i * sliceAngle - 1;
              const endAngle = startAngle + sliceAngle + 2;
              const midAngle = (startAngle + endAngle) / 2;
              const labelR = pizzaR - 26;
              const lx = peelCx + labelR * Math.cos(((midAngle - 90) * Math.PI) / 180);
              const ly = peelCy + labelR * Math.sin(((midAngle - 90) * Math.PI) / 180);
              return (
                <g key={fId}>
                  <path
                    d={describeArc(peelCx, peelCy, pizzaR - 6, startAngle, endAngle)}
                    fill={SLICE_COLORS[i]}
                    opacity={0.25}
                    stroke="#8B572A"
                    strokeWidth={0.6}
                  />
                  {flavorIcons[fId] && (
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="17" opacity={0.85}>
                      {flavorIcons[fId]}
                    </text>
                  )}
                  <text
                    x={lx}
                    y={ly + 14}
                    textAnchor="middle"
                    fill="#5C1212"
                    fontSize="5.5"
                    fontWeight="600"
                    opacity={0.7}
                    fontFamily="sans-serif"
                  >
                    {flavor}
                  </text>
                </g>
              );
            })}

          {/* 3 flavors */}
          {flavorIds.length === 3 &&
            flavorIds.map((fId, i) => {
              const flavor = flavorNames[i];
              const sliceAngle = 360 / 3;
              const startAngle = i * sliceAngle - 1;
              const endAngle = startAngle + sliceAngle + 2;
              const midAngle = (startAngle + endAngle) / 2;
              const labelR = pizzaR - 26;
              const lx = peelCx + labelR * Math.cos(((midAngle - 90) * Math.PI) / 180);
              const ly = peelCy + labelR * Math.sin(((midAngle - 90) * Math.PI) / 180);
              return (
                <g key={fId}>
                  <path
                    d={describeArc(peelCx, peelCy, pizzaR - 6, startAngle, endAngle)}
                    fill={SLICE_COLORS[i]}
                    opacity={0.25}
                    stroke="#8B572A"
                    strokeWidth={0.6}
                  />
                  {flavorIcons[fId] && (
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="14" opacity={0.85}>
                      {flavorIcons[fId]}
                    </text>
                  )}
                  <text
                    x={lx}
                    y={ly + 12}
                    textAnchor="middle"
                    fill="#5C1212"
                    fontSize="5"
                    fontWeight="600"
                    opacity={0.7}
                    fontFamily="sans-serif"
                  >
                    {flavor}
                  </text>
                </g>
              );
            })}

          <circle
            cx={peelCx}
            cy={peelCy}
            r={pizzaR + 2}
            fill="none"
            stroke="#D2B48C"
            strokeWidth={0.6}
            strokeDasharray="4 3"
            opacity={0.3}
          />
        </g>

        {/* ═══════════ HEAD ═══════════ */}
        <g filter="url(#head-shadow)">
          {/* Ears */}
          <ellipse cx="140" cy="168" rx="12" ry="15" fill="#C49158" />
          <ellipse cx="260" cy="168" rx="12" ry="15" fill="#C49158" />
          <ellipse cx="140" cy="168" rx="7" ry="9" fill="url(#face-gradient)" opacity="0.5" />
          <ellipse cx="260" cy="168" rx="7" ry="9" fill="url(#face-gradient)" opacity="0.5" />

          {/* Hair - dense wavy */}
          <g>
            <path
              d="M148 126 Q148 84 172 76 Q188 72 200 78 Q212 72 228 76 Q252 84 252 126 Q248 104 232 102 Q218 100 200 106 Q182 100 168 102 Q152 104 148 126"
              fill="#3D2B1F"
            />
            <path
              d="M152 116 Q156 102 164 110 Q172 102 178 108"
              fill="none"
              stroke="#2A1E15"
              strokeWidth="1.8"
              opacity="0.4"
            />
            <path
              d="M190 104 Q196 96 202 104 Q208 96 214 102"
              fill="none"
              stroke="#2A1E15"
              strokeWidth="1.5"
              opacity="0.35"
            />
            <path
              d="M222 108 Q228 100 236 108 Q240 102 244 110"
              fill="none"
              stroke="#2A1E15"
              strokeWidth="1.5"
              opacity="0.3"
            />
            <path d="M146 124 Q140 116 142 108 Q144 104 148 108" fill="#3D2B1F" opacity="0.7" />
            <path d="M254 124 Q260 116 258 108 Q256 104 252 108" fill="#3D2B1F" opacity="0.7" />
          </g>

          {/* Face */}
          <ellipse cx="200" cy="164" rx="54" ry="58" fill="url(#face-gradient)" />
          <ellipse cx="190" cy="151" rx="32" ry="26" fill="white" opacity="0.06" />

          {/* Chef hat */}
          <g>
            <path d="M152 116 Q148 50 200 30 Q252 50 248 116" fill="url(#hat-gradient)" />
            <path d="M158 108 Q156 56 200 40 Q244 56 242 108" fill="white" opacity="0.7" />
            <rect x="146" y="108" width="108" height="18" rx="6" fill="white" />
            <rect x="146" y="108" width="108" height="18" rx="6" fill="none" stroke="#E8E0D4" strokeWidth="0.6" />
            <path d="M162 76 Q170 74 178 78" fill="none" stroke="#E0D8CC" strokeWidth="0.8" opacity="0.5" />
            <path d="M210 72 Q218 70 226 76" fill="none" stroke="#E0D8CC" strokeWidth="0.8" opacity="0.5" />
            <circle cx="172" cy="52" r="16" fill="white" opacity="0.7" />
            <circle cx="200" cy="38" r="18" fill="white" opacity="0.8" />
            <circle cx="228" cy="52" r="16" fill="white" opacity="0.7" />
            <circle cx="160" cy="64" r="10" fill="white" opacity="0.5" />
            <circle cx="240" cy="64" r="10" fill="white" opacity="0.5" />
            <circle cx="198" cy="34" r="8" fill="white" opacity="0.3" />
          </g>

          {/* Eyes */}
          <ellipse cx="178" cy="158" rx="14" ry="15" fill="white" />
          <ellipse cx="180" cy="159" rx="9" ry="10" fill="#6B4226" />
          <ellipse cx="180" cy="159" rx="7.5" ry="8.5" fill="#5C3A1E" />
          <circle cx="180" cy="159" r="5" fill="#2A1E15" />
          <circle cx="184" cy="155" r="3.8" fill="white" />
          <circle cx="177" cy="163" r="2" fill="white" opacity="0.75" />

          <ellipse cx="222" cy="158" rx="14" ry="15" fill="white" />
          <ellipse cx="224" cy="159" rx="9" ry="10" fill="#6B4226" />
          <ellipse cx="224" cy="159" rx="7.5" ry="8.5" fill="#5C3A1E" />
          <circle cx="224" cy="159" r="5" fill="#2A1E15" />
          <circle cx="228" cy="155" r="3.8" fill="white" />
          <circle cx="221" cy="163" r="2" fill="white" opacity="0.75" />

          {/* Eyebrows */}
          <path d="M164 142 Q178 136 192 142" fill="none" stroke="#3D2B1F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M208 142 Q222 136 236 142" fill="none" stroke="#3D2B1F" strokeWidth="3.5" strokeLinecap="round" />

          {/* Nose */}
          <ellipse cx="200" cy="172" rx="6" ry="5" fill="#C49158" />
          <ellipse cx="199" cy="170.5" rx="2.5" ry="1.8" fill="#D4A574" opacity="0.55" />
          <ellipse cx="200" cy="174" rx="3.5" ry="1" fill="#B07848" opacity="0.2" />

          {/* ─── MUSTACHE - big, thick, proper curls ─── */}
          <g>
            {/* Main body - thick and wide */}
            <path
              d="M170 186 Q176 174 200 178 Q224 174 230 186 Q236 196 228 202 Q220 196 200 200 Q180 196 172 202 Q164 196 170 186 Z"
              fill="#3D2B1F"
            />
            {/* Highlight streak */}
            <path
              d="M178 188 Q190 180 200 182 Q210 180 222 188"
              fill="none"
              stroke="#5C4033"
              strokeWidth="1"
              opacity="0.35"
            />
            {/* Left curl - spiraling outward */}
            <path
              d="M170 200 Q162 206 160 214 Q160 220 166 222 Q172 222 174 216"
              fill="none"
              stroke="#3D2B1F"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M164 220 Q160 226 164 228" fill="none" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right curl - spiraling outward */}
            <path
              d="M230 200 Q238 206 240 214 Q240 220 234 222 Q228 222 226 216"
              fill="none"
              stroke="#3D2B1F"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M236 220 Q240 226 236 228" fill="none" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Smile */}
          <path d="M182 201 Q200 214 218 201" fill="none" stroke="#8B572A" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M190 204 Q200 210 210 204" fill="none" stroke="#A06830" strokeWidth="0.6" opacity="0.3" />

          {/* Rosy cheeks */}
          <circle cx="160" cy="180" r="13" fill="url(#cheek-rosy)" />
          <circle cx="240" cy="180" r="13" fill="url(#cheek-rosy)" />
          <text x="156" y="184" fontSize="7" opacity="0.22" fill="#E06060">
            ♥
          </text>
          <text x="236" y="184" fontSize="7" opacity="0.22" fill="#E06060">
            ♥
          </text>
        </g>
      </g>
    </svg>
  );
};

export default ChefMascot;
