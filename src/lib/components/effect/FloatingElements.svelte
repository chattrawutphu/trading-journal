<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let floatingContainer;
  let floatingElements = [];
  let floatingAnimationId;
  let isVisible = true;
  let lastRenderTime = 0;
  const frameInterval = 1000 / 15; // Limit to 15 FPS for better performance

  // Define trading icons
  const icons = [
    {
      name: 'chart-line',
      path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      color: 'rgba(59, 130, 246, 0.2)' // blue
    },
    {
      name: 'chart-bar',
      path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'rgba(139, 92, 246, 0.2)' // purple
    },
    {
      name: 'trending-up',
      path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'rgba(16, 185, 129, 0.2)' // green
    },
    {
      name: 'candlestick',
      path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'rgba(239, 68, 68, 0.2)' // red
    },
    {
      name: 'dollar-sign',
      path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'rgba(245, 158, 11, 0.2)' // yellow
    }
  ];

  function initFloatingElements() {
    if (!floatingContainer || !browser) return;
    
    const { width, height } = floatingContainer.getBoundingClientRect();
    // Reduce number of elements for better performance
    const elementCount = Math.min(Math.floor(width * height / 200000), 8);
    
    floatingElements = Array.from({ length: elementCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 15 + 15, // Smaller elements
      speedX: (Math.random() - 0.5) * 0.2, // Slower movement
      speedY: (Math.random() - 0.5) * 0.2, // Slower movement
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.2, // Slower rotation
      icon: icons[Math.floor(Math.random() * icons.length)]
    }));
  }
  
  function updateFloatingElements(timestamp) {
    // Skip frames to improve performance
    if (timestamp - lastRenderTime < frameInterval) {
      floatingAnimationId = requestAnimationFrame(updateFloatingElements);
      return;
    }
    
    lastRenderTime = timestamp;
    
    if (!floatingContainer || !isVisible) {
      floatingAnimationId = requestAnimationFrame(updateFloatingElements);
      return;
    }
    
    const { width, height } = floatingContainer.getBoundingClientRect();
    
    floatingElements = floatingElements.map(element => {
      // Update position
      element.x += element.speedX;
      element.y += element.speedY;
      
      // Update rotation - only update every other frame
      if (Math.random() > 0.5) {
        element.rotation += element.rotationSpeed;
      }
      
      // Simplified boundary check
      if (element.x < 0) element.x = width - element.size;
      if (element.x > width - element.size) element.x = 0;
      if (element.y < 0) element.y = height - element.size;
      if (element.y > height - element.size) element.y = 0;
      
      return element;
    });
    
    // Force update
    floatingElements = [...floatingElements];
    
    floatingAnimationId = requestAnimationFrame(updateFloatingElements);
  }

  // Use Intersection Observer to only render when visible
  let observer;

  onMount(() => {
    if (!browser) return;
    
    initFloatingElements();
    
    // Use a debounced resize handler
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(initFloatingElements, 250);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Use Intersection Observer to pause animation when not visible
    observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      
      if (isVisible && !floatingAnimationId) {
        floatingAnimationId = requestAnimationFrame(updateFloatingElements);
      } else if (!isVisible && floatingAnimationId) {
        cancelAnimationFrame(floatingAnimationId);
        floatingAnimationId = null;
      }
    }, { threshold: 0.1 });
    
    if (floatingContainer) {
      observer.observe(floatingContainer);
    }
    
    // Only start animation when visible
    if (isVisible) {
      floatingAnimationId = requestAnimationFrame(updateFloatingElements);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (observer) observer.disconnect();
      cancelAnimationFrame(floatingAnimationId);
    };
  });

  onDestroy(() => {
    if (floatingAnimationId) {
      cancelAnimationFrame(floatingAnimationId);
    }
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div bind:this={floatingContainer} class="absolute inset-0 overflow-hidden pointer-events-none z-0">
  {#each floatingElements as element, i}
    <div 
      class="floating-element" 
      style="left: {element.x}px; top: {element.y}px; transform: rotate({element.rotation}deg);"
    >
      <svg 
        width={element.size} 
        height={element.size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={element.icon.color} 
        stroke-width="1.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        style="will-change: transform;"
      >
        <path d={element.icon.path}></path>
      </svg>
    </div>
  {/each}
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
  
  .overflow-hidden {
    overflow: hidden;
  }
  
  .pointer-events-none {
    pointer-events: none;
  }
  
  .z-0 {
    z-index: 0;
  }
  
  .floating-element {
    position: absolute;
    will-change: transform;
    transform: translateZ(0);
    transition: transform 0.2s linear;
  }
</style> 