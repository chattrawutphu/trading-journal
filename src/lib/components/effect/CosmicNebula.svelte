<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let canvas;
  let mousePosition = null;
  let isClicking = false;
  let ctx;
  let width, height;
  let lastRenderTime = 0;
  const targetFPS = 30; // Lower FPS for better performance
  const frameInterval = 1000 / targetFPS;

  // Reduced particle settings for better performance
  const options = {
    particleCount: 80, // Reduced from 150
    particleSize: 2, // Reduced from 3
    particleSpeed: 0.3, // Reduced from 0.5
    connectionDistance: 100, // Reduced from 120
    trailLength: 5, // Reduced from 20
    colors: [
      "rgba(138, 43, 226, 0.6)",  // BlueViolet with lower opacity
      "rgba(75, 0, 130, 0.6)",    // Indigo with lower opacity
      "rgba(0, 0, 255, 0.6)",     // Blue with lower opacity
      "rgba(0, 191, 255, 0.6)",   // DeepSkyBlue with lower opacity
    ],
    mouseEffect: "repel",
    mouseRadius: 150, // Reduced from 200
    mouseStrength: 0.05, // Reduced from 0.1
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    fadeAmount: 0.1,
    particleShape: "circle", // Changed from star to circle for better performance
    glowIntensity: 10, // Reduced from 20
    movementPattern: "circular"
  };

  let particles = [];
  let animationFrameId;
  let isVisible = true;

  // Lazily initialize when in viewport
  function initParticles() {
    particles = [];
    // Dynamically adjust particle count based on screen size
    const particleCount = Math.min(
      options.particleCount,
      Math.floor((width * height) / 25000)
    );
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const speedMultiplier = options.particleSpeed;
      
      let speedX = (Math.random() * 2 - 1) * speedMultiplier;
      let speedY = (Math.random() * 2 - 1) * speedMultiplier;
      
      particles.push({
        x,
        y,
        size: Math.random() * options.particleSize + 1,
        speedX,
        speedY,
        color: options.colors[Math.floor(Math.random() * options.colors.length)],
        trail: [],
        angle: Math.random() * Math.PI * 2,
        originalX: x,
        originalY: y
      });
    }
  }

  // Simplified particle drawing for better performance
  function drawParticle(particle) {
    const { x, y, size, color } = particle;
    
    // Use simple circle instead of star shape for better performance
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Simplified movement pattern with less calculations
  function updateParticleMovement(particle) {
    if (particle.angle === undefined) particle.angle = 0;
    
    particle.angle += 0.005 * options.particleSpeed;
    
    particle.x += Math.cos(particle.angle) * 0.3;
    particle.y += Math.sin(particle.angle) * 0.3;
    
    // Simple boundary check
    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;
  }

  // Optimized drawing function with connection limit
  function drawParticles(timestamp) {
    // Skip frames to match target FPS
    if (timestamp - lastRenderTime < frameInterval) {
      animationFrameId = requestAnimationFrame(drawParticles);
      return;
    }
    
    lastRenderTime = timestamp;
    
    // Clear with semi-transparent fill for fade effect
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw particles
    particles.forEach(particle => {
      // Update position
      updateParticleMovement(particle);
      
      // Simplified trail (shorter and less frequent updates)
      if (Math.random() > 0.7) { // Only update trail occasionally
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > options.trailLength) {
          particle.trail.shift();
        }
      }
      
      // Draw particle
      drawParticle(particle);
    });
    
    // Limit connections to improve performance - only check every 3rd particle
    const connectionLimit = 3;
    for (let i = 0; i < particles.length; i += 3) {
      let connectionCount = 0;
      for (let j = i + 3; j < particles.length && connectionCount < connectionLimit; j += 3) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < options.connectionDistance) {
          connectionCount++;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          
          ctx.strokeStyle = particles[i].color;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = 1 - distance / options.connectionDistance;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    
    animationFrameId = requestAnimationFrame(drawParticles);
  }

  // Use Intersection Observer to only render when visible
  let observer;

  onMount(() => {
    if (!browser) return;
    
    ctx = canvas?.getContext("2d", { 
      alpha: true,
      desynchronized: true, // Potential performance improvement
    });
    
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      
      // Use logical size for better performance on high DPI screens
      canvas.width = width;
      canvas.height = height;
      
      initParticles();
    };

    resize();
    window.addEventListener("resize", resize);
    
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
    
    observer.observe(canvas);
    
    // Only start animation when visible
    if (isVisible) {
      animationFrameId = requestAnimationFrame(drawParticles);
    }

    // Throttled event handlers for better performance
    let ticking = false;
    
    const handleMouseMove = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          mousePosition = { x: e.clientX, y: e.clientY };
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (observer) observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
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

<canvas bind:this={canvas} class="block CosmicNebula"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background-color: transparent;
    z-index: -1;
  }
</style> 