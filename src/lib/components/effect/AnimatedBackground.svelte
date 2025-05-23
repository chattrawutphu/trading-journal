<script>
  import { onMount, onDestroy } from 'svelte';

  // Configurable parameters as props
  export let particleCount = 250;
  export let particleSize = { min: 1, max: 2 };
  export let particleSpeed = { min: -0.3, max: 0.3 };
  export let particleOpacity = { min: 0.1, max: 0.4 };
  export let connectionDistance = 250;
  export let connectionOpacity = 0.25;
  export let backgroundColor = "linear-gradient(to bottom, #050714, #0a0b1e, #0f0e28)";

  let canvasElement;
  let canvasContainer;
  let animationFrameId;
  let particles = [];

  function initCanvas() {
    if (!canvasElement || !canvasContainer) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = resizeCanvas();
    createParticles(width, height);
  }
  
  function resizeCanvas() {
    if (!canvasElement || !canvasContainer) return { width: 0, height: 0 };
    
    const { width, height } = canvasContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasElement.width = width * dpr;
    canvasElement.height = height * dpr;
    const ctx = canvasElement.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    return { width, height };
  }
  
  function createParticles(width, height) {
    particles = [];
    const count = Math.min(Math.floor(width * height / 10000), particleCount);
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (particleSize.max - particleSize.min) + particleSize.min,
        speedX: Math.random() * (particleSpeed.max - particleSpeed.min) + particleSpeed.min,
        speedY: Math.random() * (particleSpeed.max - particleSpeed.min) + particleSpeed.min,
        opacity: Math.random() * (particleOpacity.max - particleOpacity.min) + particleOpacity.min,
        opacitySpeed: Math.random() * 0.01
      });
    }
  }
  
  function drawParticles() {
    if (!canvasElement || !canvasContainer) {
      animationFrameId = requestAnimationFrame(drawParticles);
      return;
    }
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
      animationFrameId = requestAnimationFrame(drawParticles);
      return;
    }
    
    const { width, height } = canvasContainer.getBoundingClientRect();
    
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw connections first
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const distance = Math.sqrt(
          Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
        );
        
        if (distance < connectionDistance) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${connectionOpacity * (1 - distance / connectionDistance)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    
    // Draw particles and update positions
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Update opacity with pulsing effect
      p.opacity += p.opacitySpeed;
      if (p.opacity > particleOpacity.max || p.opacity < particleOpacity.min) {
        p.opacitySpeed = -p.opacitySpeed;
      }
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
      
      // Update position
      p.x += p.speedX;
      p.y += p.speedY;
      
      // Bounce off edges
      if (p.x < 0 || p.x > width) p.speedX = -p.speedX;
      if (p.y < 0 || p.y > height) p.speedY = -p.speedY;
    }
    
    animationFrameId = requestAnimationFrame(drawParticles);
  }

  onMount(() => {
    // Initialize particle animation
    initCanvas();
    window.addEventListener('resize', initCanvas);
    
    // Start animation
    drawParticles();
    
    return () => {
      window.removeEventListener('resize', initCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
</script>

<div bind:this={canvasContainer} class="absolute inset-0 z-0">
  <canvas 
    bind:this={canvasElement} 
    class="absolute inset-0"
    style="background: {backgroundColor};"
  ></canvas>
</div>

<style>
  .absolute {
    position: absolute;
  }
  
  .inset-0 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
  
  .z-0 {
    z-index: 0;
  }
</style> 