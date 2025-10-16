import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/class-names.util';

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  rotationDirection: string;
  siner: number;
  steps: number;
  friction: number;
  element: Element | null;
}

@Component({
  selector: 'app-animated-bubble-particles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #containerRef
      class="animated-particles-container"
      [style.z-index]="zIndex"
      [style.width]="width"
      [style.height]="height"
      [style.background-color]="backgroundColor"
      [ngClass]="cn('relative overflow-hidden w-full h-full', className)"
    >
      <div 
        #particlesRef
        class="particles-layer"
        [style.filter]="enableGooEffect ? 'url(#' + gooId + ')' : undefined"
      ></div>

      <div class="content-layer">
        <ng-content></ng-content>
      </div>

      <svg *ngIf="enableGooEffect" class="svg-filters">
        <defs>
          <filter [id]="gooId">
            <feGaussianBlur
              in="SourceGraphic"
              result="blur"
              [attr.stdDeviation]="blurStrength"
            />
            <feColorMatrix
              in="blur"
              result="colormatrix"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -9"
            />
            <feBlend in="SourceGraphic" in2="colormatrix" />
          </filter>
        </defs>
      </svg>
    </div>
  `,
  styles: [`
    .animated-particles-container {
      position: relative;
      overflow: hidden;
      width: 100%;
      height: 100%;
      /* Ensure proper rendering on mobile */
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      /* Hardware acceleration for better performance */
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }

    .particles-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      /* Optimize for mobile rendering */
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
    }

    .content-layer {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      width: 100%;
      height: 100%;
    }

    .svg-filters {
      position: absolute;
      width: 0;
      height: 0;
      z-index: 0;
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .animated-particles-container {
        /* Reduce complexity on mobile */
        will-change: auto;
      }
      
      .particles-layer {
        /* Optimize rendering on mobile */
        -webkit-transform: translate3d(0, 0, 0);
        transform: translate3d(0, 0, 0);
      }
    }

    /* Tablet optimizations */
    @media (min-width: 769px) and (max-width: 1024px) {
      .animated-particles-container {
        /* Moderate optimizations for tablets */
        will-change: transform;
      }
    }

    /* Desktop optimizations */
    @media (min-width: 1025px) {
      .animated-particles-container {
        /* Full effects on desktop */
        will-change: transform, filter;
      }
    }
  `]
})
export class AnimatedBubbleParticlesComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() className: string = '';
  @Input() backgroundColor: string = '#edf3f8';
  @Input() particleColor: string = '#3e82f7';
  @Input() particleSize: number = 30;
  @Input() spawnInterval: number = 180;
  @Input() height: string = '100vh';
  @Input() width: string = '100vw';
  @Input() enableGooEffect: boolean = true;
  @Input() blurStrength: number = 12;
  @Input() pauseOnBlur: boolean = true;
  @Input() zIndex: number = 1;
  @Input() friction: { min: number; max: number } = { min: 1, max: 2 };
  @Input() scaleRange: { min: number; max: number } = { min: 0.4, max: 2.4 };
  @Input() enableMobileOptimization: boolean = true;

  @ViewChild('containerRef', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('particlesRef', { static: true }) particlesRef!: ElementRef<HTMLDivElement>;

  private animationRef?: number;
  private intervalRef?: number;
  private particlesArray: ParticleConfig[] = [];
  private isPaused = false;
  public gooId = 'goo-' + Math.random().toString(36).substring(2, 11);
  private dimensions = { width: 0, height: 0 };
  private isMobile = false;
  private isTablet = false;
  private maxParticles = 50; // Default max particles
  private currentParticleCount = 0;

  // Make cn function available in template
  cn = cn;

  ngOnInit(): void {
    this.detectDeviceType();
    this.setMobileOptimizations();
    
    if (this.pauseOnBlur) {
      window.addEventListener('blur', this.handleBlur.bind(this));
      window.addEventListener('focus', this.handleFocus.bind(this));
    }
  }

  ngAfterViewInit(): void {
    this.updateDimensions();
    window.addEventListener('resize', this.updateDimensions.bind(this));
    this.addTouchSupport();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    window.removeEventListener('resize', this.updateDimensions.bind(this));
    if (this.pauseOnBlur) {
      window.removeEventListener('blur', this.handleBlur.bind(this));
      window.removeEventListener('focus', this.handleFocus.bind(this));
    }
  }

  private updateDimensions(): void {
    if (this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      this.dimensions = { width: rect.width, height: rect.height };
    }
  }

  private createParticleElement(): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 
      'display: block;' +
      'width: ' + this.particleSize + 'px;' +
      'height: ' + this.particleSize + 'px;' +
      'position: absolute;' +
      'transform: translateZ(0px);';
    svg.setAttribute('viewBox', '0 0 67.4 67.4');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '33.7');
    circle.setAttribute('cy', '33.7');
    circle.setAttribute('r', '33.7');
    circle.setAttribute('fill', this.particleColor);

    svg.appendChild(circle);
    return svg;
  }

  private createParticle(): ParticleConfig {
    const element = this.createParticleElement();
    if (this.particlesRef?.nativeElement) {
      this.particlesRef.nativeElement.appendChild(element);
    }

    const x = Math.random() * this.dimensions.width;
    const y = this.dimensions.height + 100;
    const steps = this.dimensions.height / 2;
    const frictionValue = this.friction.min + Math.random() * (this.friction.max - this.friction.min);
    const scale = this.scaleRange.min + Math.random() * (this.scaleRange.max - this.scaleRange.min);
    const siner = (this.dimensions.width / 2.5) * Math.random();
    const rotationDirection = Math.random() > 0.5 ? '+' : '-';

    element.style.transform = 'translateX(' + x + 'px) translateY(' + y + 'px)';

    // Increment particle count
    this.currentParticleCount++;

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      scale,
      rotation: 0,
      rotationDirection,
      siner,
      steps,
      friction: frictionValue,
      element,
    };
  }

  private updateParticle(particle: ParticleConfig): boolean {
    particle.y -= particle.friction;

    const left = particle.x + Math.sin((particle.y * Math.PI) / particle.steps) * particle.siner;
    const top = particle.y;
    const rotation = particle.rotationDirection + (particle.y + this.particleSize);

    if (particle.element) {
      const element = particle.element as SVGElement;
      element.style.transform = 
        'translateX(' + left + 'px) translateY(' + top + 'px) scale(' + 
        particle.scale + ') rotate(' + rotation + 'deg)';
    }

    if (particle.y < -this.particleSize) {
      if (particle.element && particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
      // Decrement particle count when particle is removed
      this.currentParticleCount = Math.max(0, this.currentParticleCount - 1);
      return false;
    }

    return true;
  }

  private animate = (): void => {
    if (this.isPaused) {
      this.animationRef = requestAnimationFrame(this.animate);
      return;
    }

    this.particlesArray = this.particlesArray.filter(particle => this.updateParticle(particle));
    this.animationRef = requestAnimationFrame(this.animate);
  };

  private spawnParticle = (): void => {
    if (!this.isPaused && this.dimensions.width > 0 && this.dimensions.height > 0 && this.shouldSpawnParticle()) {
      const particle = this.createParticle();
      this.particlesArray.push(particle);
    }
  };

  private startAnimation(): void {
    if (this.dimensions.width > 0 && this.dimensions.height > 0) {
      this.animationRef = requestAnimationFrame(this.animate);
      this.intervalRef = window.setInterval(this.spawnParticle, this.spawnInterval);
    }
  }

  private stopAnimation(): void {
    if (this.animationRef) {
      cancelAnimationFrame(this.animationRef);
    }
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
    this.particlesArray.forEach(particle => {
      if (particle.element && particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    });
    this.particlesArray = [];
  }

  private handleBlur(): void {
    this.isPaused = true;
  }

  private handleFocus(): void {
    this.isPaused = false;
  }

  private detectDeviceType(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    
    // Detect mobile devices
    this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                   screenWidth <= 768;
    
    // Detect tablets
    this.isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent) || 
                   (screenWidth > 768 && screenWidth <= 1024);
  }

  private setMobileOptimizations(): void {
    if (!this.enableMobileOptimization) return;

    if (this.isMobile) {
      // Mobile optimizations
      this.maxParticles = 15; // Reduce particle count for mobile
      this.particleSize = Math.min(this.particleSize, 25); // Smaller particles
      this.spawnInterval = Math.max(this.spawnInterval, 300); // Slower spawn rate
      this.enableGooEffect = false; // Disable goo effect on mobile for performance
      this.blurStrength = 0; // No blur on mobile
    } else if (this.isTablet) {
      // Tablet optimizations
      this.maxParticles = 25; // Moderate particle count for tablets
      this.particleSize = Math.min(this.particleSize, 35); // Slightly smaller particles
      this.spawnInterval = Math.max(this.spawnInterval, 200); // Moderate spawn rate
      this.blurStrength = Math.min(this.blurStrength, 6); // Reduced blur
    }
  }

  private shouldSpawnParticle(): boolean {
    return this.currentParticleCount < this.maxParticles;
  }

  private addTouchSupport(): void {
    if (this.isMobile && this.containerRef?.nativeElement) {
      // Add touch event listeners for mobile devices
      this.containerRef.nativeElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.containerRef.nativeElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    // Pause animation briefly on touch to improve performance
    if (this.isMobile) {
      this.isPaused = true;
      setTimeout(() => {
        this.isPaused = false;
      }, 100);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // Continue pausing during touch movement for better performance
    if (this.isMobile) {
      this.isPaused = true;
      setTimeout(() => {
        this.isPaused = false;
      }, 50);
    }
  }
}