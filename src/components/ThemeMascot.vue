<template>
  <div class="mascot" :class="'mascot--' + id">
    <!-- tech — робот -->
    <svg v-if="id === 'tech'" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="m-shadow" cx="60" cy="106" rx="30" ry="4"/>
      <g class="m-bob">
        <line x1="60" y1="26" x2="60" y2="16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle class="m-antenna" cx="60" cy="13" r="4" fill="currentColor"/>
        <rect x="26" y="30" width="68" height="60" rx="16" fill="currentColor"/>
        <rect x="34" y="42" width="52" height="30" rx="10" fill="#fff"/>
        <circle class="m-eye" cx="48" cy="57" r="5" fill="currentColor"/>
        <circle class="m-eye" cx="72" cy="57" r="5" fill="currentColor"/>
        <path class="m-mouth" d="M50 80h20" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
        <circle cx="22" cy="60" r="6" fill="currentColor"/>
        <circle cx="98" cy="60" r="6" fill="currentColor"/>
      </g>
    </svg>

    <!-- business — портфель -->
    <svg v-else-if="id === 'business'" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="m-shadow" cx="60" cy="106" rx="32" ry="4"/>
      <g class="m-bob">
        <path d="M46 42v-6a8 8 0 0 1 8-8h12a8 8 0 0 1 8 8v6"
              stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="20" y="42" width="80" height="56" rx="12" fill="currentColor"/>
        <rect class="m-flap" x="20" y="58" width="80" height="10" fill="#fff" opacity=".35"/>
        <circle class="m-eye" cx="48" cy="78" r="4" fill="#fff"/>
        <circle class="m-eye" cx="72" cy="78" r="4" fill="#fff"/>
        <path class="m-mouth" d="M54 90h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <rect x="54" y="60" width="12" height="8" rx="2" fill="#fff"/>
      </g>
    </svg>

    <!-- health — сердце -->
    <svg v-else-if="id === 'health'" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="m-shadow" cx="60" cy="106" rx="30" ry="4"/>
      <g class="m-beat">
        <path d="M60 96s-34-22-34-46c0-13 10-22 22-22 8 0 12 4 12 4s4-4 12-4c12 0 22 9 22 22 0 24-34 46-34 46z"
              fill="currentColor"/>
        <path class="m-pulse" d="M36 62h12l4-10 6 20 5-12h21"
              stroke="#fff" stroke-width="4" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="m-eye" cx="50" cy="48" r="3.5" fill="#fff"/>
        <circle class="m-eye" cx="70" cy="48" r="3.5" fill="#fff"/>
      </g>
    </svg>

    <!-- science — атом -->
    <svg v-else viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="m-shadow" cx="60" cy="106" rx="30" ry="4"/>
      <g class="m-bob">
        <ellipse class="m-orbit o1" cx="60" cy="58" rx="38" ry="16"
                 stroke="currentColor" stroke-width="3" fill="none"/>
        <ellipse class="m-orbit o2" cx="60" cy="58" rx="38" ry="16"
                 stroke="currentColor" stroke-width="3" fill="none"/>
        <ellipse class="m-orbit o3" cx="60" cy="58" rx="38" ry="16"
                 stroke="currentColor" stroke-width="3" fill="none"/>
        <circle cx="60" cy="58" r="10" fill="currentColor"/>
        <circle class="m-eye" cx="57" cy="56" r="1.6" fill="#fff"/>
        <circle class="m-eye" cx="63" cy="56" r="1.6" fill="#fff"/>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ themeId: { type: String, default: 'tech' } })
const id = computed(() => props.themeId || 'tech')
</script>

<style scoped>
.mascot {
  width: 148px;
  height: 148px;
  color: var(--accent);
  display: inline-block;
  animation: mFloat 3.6s ease-in-out infinite;
  will-change: transform;
}
.mascot svg { width: 100%; height: 100%; display: block; }

@keyframes mFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

.m-bob { transform-origin: 60px 60px; animation: mBob 2.6s ease-in-out infinite; }
@keyframes mBob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50%      { transform: translateY(-3px) rotate(2deg); }
}

.m-shadow { fill: rgba(0,0,0,.08); animation: mShadow 2.6s ease-in-out infinite; }
@keyframes mShadow {
  0%, 100% { opacity: .8; }
  50%      { opacity: .5; }
}

.m-antenna { animation: mBlink 1.6s ease-in-out infinite; }
@keyframes mBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: .25; }
}

.m-eye { transform-origin: center; animation: mEyeBlink 4s ease-in-out infinite; }
@keyframes mEyeBlink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%           { transform: scaleY(.15); }
}

.m-mouth { transform-origin: center; animation: mMouth 3s ease-in-out infinite; }
@keyframes mMouth {
  0%, 100% { transform: scaleX(1); }
  50%      { transform: scaleX(1.2); }
}

.m-beat { transform-origin: 60px 60px; animation: mHeart 1.6s ease-in-out infinite; }
@keyframes mHeart {
  0%, 100% { transform: scale(1); }
  15%      { transform: scale(1.06); }
  30%      { transform: scale(.98); }
  45%      { transform: scale(1.04); }
}

.m-pulse { animation: mPulseLine 1.6s ease-in-out infinite; }
@keyframes mPulseLine {
  0%, 100% { opacity: 1; }
  50%      { opacity: .7; }
}

.m-flap { animation: mFlap 3s ease-in-out infinite; }
@keyframes mFlap {
  0%, 100% { opacity: .35; }
  50%      { opacity: .6; }
}

.m-orbit { transform-origin: 60px 58px; }
.o1 { animation: mOrb1 6s linear infinite; }
.o2 { animation: mOrb2 6s linear infinite; }
.o3 { animation: mOrb3 6s linear infinite; }
@keyframes mOrb1 { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
@keyframes mOrb2 { from { transform: rotate(60deg); }  to { transform: rotate(420deg); } }
@keyframes mOrb3 { from { transform: rotate(-60deg); } to { transform: rotate(300deg); } }

@media (prefers-reduced-motion: reduce) {
  .mascot, .m-bob, .m-eye, .m-mouth, .m-beat,
  .m-antenna, .m-orbit, .m-shadow, .m-flap, .m-pulse { animation: none !important; }
}
</style>