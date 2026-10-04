import React from "react";

// Official YouTube Red Play Icon SVG
export function YoutubeIcon({ width = 20, height = 20, className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill="#FF0000"
      />
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF" />
    </svg>
  );
}

// PDF Document Icon SVG
export function PdfIcon({ width = 20, height = 20, color = "#DC2626", className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 17H13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Website Globe Icon SVG
export function GlobeIcon({ width = 20, height = 20, color = "#0284C7", className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12H22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Lightning Bolt Semantic Cache Icon SVG
export function LightningIcon({ width = 20, height = 20, color = "#4F46E5", className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// GitHub Icon SVG
export function GithubIcon({ width = 20, height = 20, color = "#0F172A", className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

// 3D Isometric Stack Illustration SVG
export function IsometricStackGraphic({ width = 180, height = 180, className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="70" fill="url(#stack-glow)" opacity="0.4" />
      <path d="M100 155L160 125L100 95L40 125L100 155Z" fill="#7C3AED" />
      <path d="M40 125L100 155V168L40 138V125Z" fill="#5B21B6" />
      <path d="M160 125L100 155V168L160 138V125Z" fill="#4C1D95" />
      <path d="M100 135L160 105L100 75L40 105L100 135Z" fill="#2563EB" />
      <path d="M40 105L100 135V145L40 115V105Z" fill="#1D4ED8" />
      <path d="M160 105L100 135V145L160 115V105Z" fill="#1E40AF" />
      <path d="M100 115L160 85L100 55L40 85L100 115Z" fill="#0EA5E9" />
      <path d="M40 85L100 115V125L40 95V85Z" fill="#0284C7" />
      <path d="M160 85L100 115V125L160 95V85Z" fill="#0369A1" />
      <path d="M100 95L160 65L100 35L40 65L100 95Z" fill="url(#top-layer-grad)" />
      <path d="M40 65L100 95V105L40 75V65Z" fill="#059669" />
      <path d="M160 65L100 95V105L160 75V65Z" fill="#047857" />
      <path d="M100 52L103 62L113 65L103 68L100 78L97 68L87 65L97 62L100 52Z" fill="#6EE7B7" />

      <defs>
        <radialGradient id="stack-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) scale(70)">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="top-layer-grad" x1="40" y1="65" x2="160" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
