import React from 'react';

// "A" silhouette with its crossbar reimagined as an ascending growth-chart
// line — ties the Assetra initial to the finance/growth theme in one mark.
export default function BrandMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 29L18 6.5L29 29" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.5 21.5L15 23.5L18.5 17L22 19.5L25 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
      <path d="M21.3 12.6L25 13L24.4 16.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
