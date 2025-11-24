import { useEffect } from 'react';

/**
 * Hook to prevent screenshots and protect content
 * Note: Complete prevention is impossible, but this makes it significantly harder
 */
export function usePreventScreenshots() {
  useEffect(() => {
    // Detect if running on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (typeof window.orientation !== 'undefined') ||
                     (window.innerWidth <= 768 && window.innerHeight <= 1024);
    
    // Remove any existing watermark elements that might be lingering
    const existingWatermark = document.getElementById('screenshot-watermark');
    const existingTextWatermark = document.getElementById('screenshot-text-watermark');
    if (existingWatermark) existingWatermark.remove();
    if (existingTextWatermark) existingTextWatermark.remove();
    
    // Also search for any divs containing "PROTECTED CONTENT" text and remove them
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
      if (div.textContent && div.textContent.includes('PROTECTED CONTENT')) {
        div.remove();
      }
    });
    
    // Remove any elements with repeating-linear-gradient backgrounds (watermark pattern)
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.backgroundImage && style.backgroundImage.includes('repeating-linear-gradient')) {
        const id = el.id;
        if (id && (id.includes('watermark') || id.includes('screenshot'))) {
          el.remove();
        }
      }
    });
    
    // Create warning overlay element
    const warningOverlay = document.createElement('div');
    warningOverlay.id = 'screenshot-warning-overlay';
    warningOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      color: #ff4d4d;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      flex-direction: column;
      gap: 20px;
    `;
    warningOverlay.innerHTML = `
      <div>⚠️ Screenshots are not allowed</div>
      <div style="font-size: 16px; color: #fff;">This content is protected</div>
    `;
    document.body.appendChild(warningOverlay);

    // Show warning temporarily
    const showWarningTemporary = () => {
      warningOverlay.style.display = 'flex';
      setTimeout(() => {
        warningOverlay.style.display = 'none';
      }, 2000);
    };

    // Prevent right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      showWarningTemporary();
      return false;
    };

    // Prevent common screenshot keyboard shortcuts
    const handleKeyDown = (e) => {
      // Prevent Print Screen (Windows/Linux)
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showWarningTemporary();
        return false;
      }

      // Detect Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5 (macOS screenshots)
      // Note: These are OS-level and can't be fully prevented, but we can detect and warn
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        showWarningTemporary();
        // Blur the page content as additional deterrent
        document.body.style.filter = 'blur(10px)';
        setTimeout(() => {
          document.body.style.filter = '';
        }, 1000);
        return false;
      }

      // Prevent Ctrl+Shift+P (Chrome DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        return false;
      }

      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent drag and drop of images
    const handleDragStart = (e) => {
      if (e.target.tagName === 'IMG' || e.target.closest('img')) {
        e.preventDefault();
        return false;
      }
    };

    // Prevent text selection (but allow in input fields)
    const handleSelectStart = (e) => {
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        return false;
      }
    };

    // Detect DevTools opening
    let devtools = { open: false, orientation: null };
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          // Optionally show a warning or take action
          console.warn('Developer tools detected');
          // You could redirect or show a warning here
        }
      } else {
        devtools.open = false;
      }
    };

    // Monitor for DevTools
    const devToolsInterval = setInterval(detectDevTools, 500);

    // Detect window blur (might indicate screenshot tool or another app)
    let blurTimeout;
    const handleBlur = () => {
      // When window loses focus, blur content temporarily
      blurTimeout = setTimeout(() => {
        document.body.style.filter = 'blur(5px)';
        document.body.style.opacity = '0.7';
      }, 100);
    };

    const handleFocus = () => {
      clearTimeout(blurTimeout);
      document.body.style.filter = '';
      document.body.style.opacity = '1';
    };

    // Detect visibility changes (tab switching, screenshot tools)
    // This is especially important for mobile - when app goes to background before screenshot
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - might be taking screenshot (especially on mobile)
        document.body.style.filter = 'blur(10px)';
        document.body.style.opacity = '0.5';
        if (isMobile) {
          // On mobile, show warning immediately when app goes to background
          showWarningTemporary();
        }
      } else {
        document.body.style.filter = '';
        document.body.style.opacity = '1';
      }
    };

    // Mobile-specific: Detect when page is being unloaded (might indicate screenshot on some devices)
    const handlePageHide = () => {
      if (isMobile) {
        document.body.style.filter = 'blur(10px)';
        document.body.style.opacity = '0.5';
      }
    };

    const handlePageShow = () => {
      document.body.style.filter = '';
      document.body.style.opacity = '1';
    };

    // Mobile-specific: Detect app state changes (iOS/Android)
    let appState = 'active';
    const handleAppStateChange = () => {
      if (document.hidden) {
        appState = 'background';
        // App went to background - likely screenshot attempt on mobile
        document.body.style.filter = 'blur(10px)';
        document.body.style.opacity = '0.5';
        if (isMobile) {
          showWarningTemporary();
        }
      } else {
        appState = 'active';
        document.body.style.filter = '';
        document.body.style.opacity = '1';
      }
    };

    // Mobile-specific: Prevent long-press context menu (common screenshot method on mobile)
    const handleTouchStart = (e) => {
      // On mobile, long press can trigger screenshot or context menu
      // We'll prevent it and show warning
      let touchTimer;
      touchTimer = setTimeout(() => {
        // Long press detected
        e.preventDefault();
        showWarningTemporary();
        document.body.style.filter = 'blur(5px)';
        setTimeout(() => {
          document.body.style.filter = '';
        }, 1000);
      }, 500); // 500ms = long press threshold
      
      const handleTouchEnd = () => {
        clearTimeout(touchTimer);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      
      document.addEventListener('touchend', handleTouchEnd, { once: true });
    };

    // Mobile-specific: Detect orientation changes that might indicate screenshot tools
    let lastOrientation = window.orientation !== undefined ? window.orientation : screen.orientation?.angle || 0;
    const handleOrientationChange = () => {
      if (isMobile) {
        const currentOrientation = window.orientation !== undefined ? window.orientation : screen.orientation?.angle || 0;
        // Rapid orientation changes might indicate screenshot tool
        if (Math.abs(currentOrientation - lastOrientation) > 45) {
          document.body.style.filter = 'blur(5px)';
          setTimeout(() => {
            document.body.style.filter = '';
          }, 500);
        }
        lastOrientation = currentOrientation;
      }
    };

    // Mobile-specific: Prevent screenshot gestures on mobile browsers
    const handleTouchMove = (e) => {
      if (isMobile) {
        // Prevent multi-touch gestures that might trigger screenshots
        if (e.touches.length > 1) {
          e.preventDefault();
          showWarningTemporary();
        }
      }
    };

    // Disable print
    const handleBeforePrint = (e) => {
      e.preventDefault();
      showWarningTemporary();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mobile-specific event listeners
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('pageshow', handlePageShow);
      document.addEventListener('visibilitychange', handleAppStateChange);
      
      // Orientation change detection
      if (window.orientation !== undefined) {
        window.addEventListener('orientationchange', handleOrientationChange);
      } else if (screen.orientation) {
        screen.orientation.addEventListener('change', handleOrientationChange);
      }
      
      // Prevent screenshot gestures on mobile browsers
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    // Prevent copying content (but allow in input fields)
    const handleCopy = (e) => {
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;
      
      if (!isInput) {
        e.clipboardData.setData('text/plain', '');
        e.preventDefault();
      }
    };
    
    document.addEventListener('copy', handleCopy);

    // Cleanup
    return () => {
      clearInterval(devToolsInterval);
      clearTimeout(blurTimeout);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Mobile-specific cleanup
      if (isMobile) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
        document.removeEventListener('visibilitychange', handleAppStateChange);
        
        if (window.orientation !== undefined) {
          window.removeEventListener('orientationchange', handleOrientationChange);
        } else if (screen.orientation) {
          screen.orientation.removeEventListener('change', handleOrientationChange);
        }
      }
      
      // Remove overlay elements
      const warningEl = document.getElementById('screenshot-warning-overlay');
      if (warningEl) warningEl.remove();
      
      // Reset body styles
      document.body.style.filter = '';
      document.body.style.opacity = '';
    };
  }, []);
}

