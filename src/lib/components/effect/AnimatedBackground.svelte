<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  // Reduced complexity in configuration parameters
  export let particleCount = 100; // Reduced from 250
  export let particleSize = { min: 1, max: 1.5 }; // Smaller particles
  export let particleSpeed = { min: -0.2, max: 0.2 }; // Slower particles
  export let particleOpacity = { min: 0.1, max: 0.3 }; // Lower opacity
  export let connectionDistance = 150; // Reduced from 250
  export let connectionOpacity = 0.15; // Reduced from 0.25
  export let backgroundColor = "linear-gradient(to bottom, #050714, #0a0b1e, #0f0e28)";

  let canvasElement;
  let canvasContainer;
  let animationFrameId;
  let particles = [];
  let ctx;
  let isVisible = true;
  let lastRenderTime = 0;
  const frameInterval = 1000 / 20; // Limit to 20 FPS for better performance

  function initCanvas() {
    if (!canvasElement || !canvasContainer || !browser) return;
    
    ctx = canvasElement.getContext('2d', {
      alpha: true,
      desynchronized: true // Potential performance improvement
    });
    
    if (!ctx) return;
    
    const { width, height } = resizeCanvas();
    createParticles(width, height);
  }
  
  function resizeCanvas() {
    if (!canvasElement || !canvasContainer) return { width: 0, height: 0 };
    
    const { width, height } = canvasContainer.getBoundingClientRect();
    
    // Use logical size to reduce rendering cost on high DPI screens
    canvasElement.width = width;
    canvasElement.height = height;
    
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    return { width, height };
  }
  
  function createParticles(width, height) {
    particles = [];
    // Scale particle count based on screen size but with a lower cap
    const count = Math.min(Math.floor(width * height / 20000), particleCount);
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (particleSize.max - particleSize.min) + particleSize.min,
        speedX: Math.random() * (particleSpeed.max - particleSpeed.min) + particleSpeed.min,
        speedY: Math.random() * (particleSpeed.max - particleSpeed.min) + particleSpeed.min,
        opacity: Math.random() * (particleOpacity.max - particleOpacity.min) + particleOpacity.min,
        opacitySpeed: Math.random() * 0.005 // Reduced from 0.01 for more subtle pulsing
      });
    }
  }
  
  function drawParticles(timestamp) {
    // Skip frames to improve performance
    if (timestamp - lastRenderTime < frameInterval) {
      animationFrameId = requestAnimationFrame(drawParticles);
      return;
    }
    
    lastRenderTime = timestamp;
    
    if (!canvasElement || !canvasContainer || !isVisible) {
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
    
    // Draw particles first, then connections only for nearby particles
    // This reduces overlap calculations significantly
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Update opacity less frequently with more subtle changes
      if (Math.random() > 0.6) {
        p.opacity += p.opacitySpeed;
        if (p.opacity > particleOpacity.max || p.opacity < particleOpacity.min) {
          p.opacitySpeed = -p.opacitySpeed;
        }
      }
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
      
      // Update position
      p.x += p.speedX;
      p.y += p.speedY;
      
      // Simplified boundary handling
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
      
      // Only check connections for every 3rd particle to improve performance
      if (i % 3 === 0) {
        // Limit connections per particle
        let connectionsDrawn = 0;
        const maxConnectionsPerParticle = 3;
        
        for (let j = i + 1; j < particles.length && connectionsDrawn < maxConnectionsPerParticle; j++) {
          const p2 = particles[j];
          const distance = Math.sqrt(
            Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2)
          );
          
          if (distance < connectionDistance) {
            connectionsDrawn++;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${connectionOpacity * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 0.3; // Thinner lines
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }
    
    animationFrameId = requestAnimationFrame(drawParticles);
  }

  // Use Intersection Observer to only render when visible
  let observer;

  onMount(() => {
    if (!browser) return;
    
    // Initialize particle animation
    initCanvas();
    
    // Use a debounced resize handler
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(initCanvas, 250);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Use Intersection Observer to pause animation when not visible
    observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      
      if (isVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(drawParticles);
      } else if (!isVisible && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }, { threshold: 0.1 });
    
    if (canvasContainer) {
      observer.observe(canvasContainer);
    }
    
    // Only start animation when visible
    if (isVisible) {
      animationFrameId = requestAnimationFrame(drawParticles);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (observer) observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div bind:this={canvasContainer} class="absolute inset-0 z-0">
  <canvas 
    bind:this={canvasElement} 
    class="absolute inset-0"
    style="background: {backgroundColor}; will-change: transform;"
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