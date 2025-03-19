<script>
  import { onMount, onDestroy } from 'svelte';

  let canvas;
  let mousePosition = null;
  let isClicking = false;

  // Cosmic Nebula configuration
  const options = {
    particleCount: 150,
    particleSize: 3,
    particleSpeed: 0.5,
    connectionDistance: 120,
    trailLength: 20,
    colors: [
      "rgba(138, 43, 226, 0.8)",  // BlueViolet
      "rgba(75, 0, 130, 0.8)",    // Indigo
      "rgba(0, 0, 255, 0.8)",     // Blue
      "rgba(0, 191, 255, 0.8)",   // DeepSkyBlue
    ],
    mouseEffect: "repel",
    mouseRadius: 200,
    mouseStrength: 0.1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    fadeAmount: 0.1,
    particleShape: "star",
    glowIntensity: 20,
    movementPattern: "circular"
  };

  let particles = [];
  let animationFrameId;

  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = options.particleCount || Math.floor((canvas.width * canvas.height) / 15000);
      
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const speedMultiplier = options.particleSpeed || 1;
        
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
          angle: Math.random() * Math.PI * 2, // For circular motion
          originalX: x, // For wave and grid motion
          originalY: y  // For wave and grid motion
        });
      }
    };

    const drawParticle = (particle) => {
      const { x, y, size, color } = particle;
      
      ctx.beginPath();
      
      // Star shape
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size / 2;
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * 2 * i) / (spikes * 2);
        
        if (i === 0) {
          ctx.moveTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        } else {
          ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
      }
      ctx.closePath();
      
      // Apply glow effect
      if (options.glowIntensity > 0) {
        ctx.shadowBlur = options.glowIntensity;
        ctx.shadowColor = color;
      }
      
      ctx.fillStyle = color;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    };

    const applyMouseEffect = (particle) => {
      if (!mousePosition || options.mouseEffect === "none") return;
      
      const dx = mousePosition.x - particle.x;
      const dy = mousePosition.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < options.mouseRadius) {
        const force = (options.mouseRadius - distance) / options.mouseRadius * options.mouseStrength;
        
        // Repel effect
        particle.speedX -= (dx / distance) * force;
        particle.speedY -= (dy / distance) * force;
      }
    };

    const updateParticleMovement = (particle) => {
      // Circular movement
      if (particle.angle === undefined) particle.angle = 0;
      
      const radius = 100 + Math.random() * 50;
      particle.angle += 0.01 * options.particleSpeed;
      
      particle.x += Math.cos(particle.angle) * 0.5;
      particle.y += Math.sin(particle.angle) * 0.5;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.speedX *= -1;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.speedY *= -1;
      }
    };

    const drawParticles = () => {
      // Semi-transparent background to create fade effect
      ctx.fillStyle = options.backgroundColor || "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // Apply mouse effects
        applyMouseEffect(particle);
        
        // Update position based on movement pattern
        updateParticleMovement(particle);
        
        // Add current position to trail
        particle.trail.push({ x: particle.x, y: particle.y });
        
        // Limit trail length
        if (particle.trail.length > options.trailLength) {
          particle.trail.shift();
        }
        
        // Draw trail
        if (particle.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
          
          for (let i = 1; i < particle.trail.length; i++) {
            ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
          }
          
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size / 2;
          ctx.stroke();
          
          // Draw glow effect
          if (options.glowIntensity > 0) {
            ctx.shadowBlur = options.glowIntensity;
            ctx.shadowColor = particle.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
        
        // Draw particle
        drawParticle(particle);
      });
      
      // Connect nearby particles with lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < options.connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            const gradient = ctx.createLinearGradient(
              particles[i].x, particles[i].y, 
              particles[j].x, particles[j].y
            );
            gradient.addColorStop(0, particles[i].color);
            gradient.addColorStop(1, particles[j].color);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 1 - distance / options.connectionDistance;
            
            if (options.glowIntensity > 0) {
              ctx.shadowBlur = options.glowIntensity / 2;
              ctx.shadowColor = particles[i].color;
            }
            
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
        }
      }
    };

    const animate = () => {
      drawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    // Event handlers
    const handleMouseMove = (e) => {
      mousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => {
      isClicking = true;
    };

    const handleMouseUp = () => {
      isClicking = false;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchStart = () => {
      isClicking = true;
    };

    const handleTouchEnd = () => {
      isClicking = false;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    
    resize();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  export let height = "100%";
</script>

<canvas bind:this={canvas} class="block"></canvas>

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