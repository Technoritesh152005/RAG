import React, { useEffect, useRef } from "react";

export default function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 750);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 750;
    };

    window.addEventListener("resize", handleResize);

    // Create vector node particles representing knowledge embeddings
    const nodeCount = Math.min(Math.floor(width / 22), 65);
    const nodes = [];

    const colors = [
      "rgba(16, 185, 129, ", // Emerald Green
      "rgba(52, 211, 153, ", // Mint Green
      "rgba(6, 182, 212, ",  // Electric Cyan
      "rgba(20, 184, 166, ", // Teal
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 1.2,
        colorPrefix: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const container = canvas.parentElement;
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial background ambient glow
      const bgGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        50,
        width * 0.5,
        height * 0.4,
        width * 0.7
      );
      bgGlow.addColorStop(0, "rgba(16, 185, 129, 0.06)");
      bgGlow.addColorStop(0.5, "rgba(6, 182, 212, 0.03)");
      bgGlow.addColorStop(1, "rgba(11, 15, 23, 0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw vector connection lines
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 145;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Mouse vector interaction
      if (mouseX > 0 && mouseY > 0) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const dx = mouseX - node.x;
          const dy = mouseY - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxMouseDist = 160;

          if (dist < maxMouseDist) {
            const alpha = (1 - dist / maxMouseDist) * 0.45;
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // Render & update nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        node.pulse += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.6;
        const currentAlpha = 0.5 + Math.sin(node.pulse) * 0.3;

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `${node.colorPrefix}${currentAlpha * 0.25})`;
        ctx.fill();

        // Node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${node.colorPrefix}${currentAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      aria-hidden="true"
    />
  );
}
