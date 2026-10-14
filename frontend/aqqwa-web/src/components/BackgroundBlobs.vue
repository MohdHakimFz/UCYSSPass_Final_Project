<!-- Decorative background only: glossy teal blobs and a clear soap bubble behind the glass. -->
<template>
  <div class="blobs" aria-hidden="true">
    <span class="blob blob-1"></span>
    <span class="blob blob-2"></span>
    <span class="blob blob-3"></span>
    <span class="bubble"></span>
  </div>
</template>

<style scoped>
.blobs {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.blob {
  position: absolute;
  /* glossy 3D look: light highlight top-left, deep teal shade bottom-right */
  background: radial-gradient(circle at 30% 28%, #c8fff3 0%, #5fe0c8 22%, #22b9a3 52%, #0f8f84 82%, #0b7a72 100%);
  box-shadow: inset -24px -30px 60px rgba(6, 90, 85, 0.35), inset 20px 24px 50px rgba(255, 255, 255, 0.45),
    0 40px 80px rgba(16, 140, 130, 0.25);
  opacity: 0.85;
  animation: float 16s ease-in-out infinite alternate;
}
.blob-1 {
  width: 520px;
  height: 460px;
  right: -140px;
  bottom: -120px;
  border-radius: 58% 42% 50% 50% / 55% 48% 52% 45%;
}
.blob-2 {
  width: 360px;
  height: 420px;
  left: -150px;
  top: 30%;
  border-radius: 45% 55% 60% 40% / 50% 45% 55% 50%;
  animation-duration: 20s;
  animation-delay: -6s;
}
.blob-3 {
  width: 180px;
  height: 180px;
  right: 18%;
  top: 8%;
  border-radius: 50%;
  opacity: 0.5;
  filter: blur(2px);
  animation-duration: 13s;
}
/* A see-through soap bubble with a faint rainbow rim */
.bubble {
  position: absolute;
  width: 440px;
  height: 400px;
  left: 30%;
  top: -160px;
  border-radius: 52% 48% 46% 54% / 50% 52% 48% 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.08) 35%, rgba(255, 255, 255, 0) 60%);
  border: 2px solid rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.5), inset 8px -6px 0 rgba(120, 220, 255, 0.25),
    inset -6px 8px 0 rgba(255, 200, 240, 0.2);
  animation: float 22s ease-in-out infinite alternate;
}
@keyframes float {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(18px, -26px) rotate(8deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .blob,
  .bubble {
    animation: none;
  }
}
@media (max-width: 700px) {
  .blob-1 {
    width: 320px;
    height: 300px;
  }
  .blob-2 {
    width: 220px;
    height: 260px;
  }
}
</style>
