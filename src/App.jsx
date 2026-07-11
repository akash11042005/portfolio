import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

// Gallery Data matching the curated Unsplash placeholders
const galleryData = {
  posters: {
    tag: "POSTER MAKING",
    title: "More Posters",
    items: [
      "/assets/poster1.png",
      "/assets/poster2.png",
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?auto=format&fit=crop&w=600&q=80"
    ]
  }
};

// Reels data — add your video file path to each reel's `video` field.
// When no video is available, set `video: null` (the card won't be clickable).
const reelsData = [
  {
    num: "01 / SLOW ART",
    title: "Blueberries, Retro Music & a Quiet Moment",
    desc: "Oil pastels, an old playlist, and the kind of happiness that only shows up when nobody's watching.",
    thumb: "/assets/reel-1-thumb.jpg",
    video: "/assets/reel-1.mp4"
  },
  {
    num: "02 / GRWM",
    title: "Draped in Silk, Dressed Like a Memory",
    desc: "Every ethnic day starts the same way — a little kohl, a little nostalgia, and a saree that remembers before I do.",
    thumb: "/assets/reel-2-thumb.jpg",
    video: "/assets/reel-2.mp4"
  },
  {
    num: "03 / QUIET HOURS",
    title: "Small Circle, Quiet Room, Too Many Hobbies to Count",
    desc: "I disappear into the things I love, and somehow that's where I find myself again.",
    thumb: "/assets/reel-3-thumb.jpg",
    video: "/assets/reel-3.mp4"
  },
  {
    num: "04 / SELF & CRAFT",
    title: "The Art of Figuring It Out Alone",
    desc: "No tutorial, no shortcut — just me, a pencil, and the slow relief of learning it on my own.",
    thumb: "/assets/reel-4-thumb.jpg",
    video: "/assets/reel-4.mp4"
  },
  {
    num: "05 / DIARY",
    title: "I Cried Watching It Fall",
    desc: "Some things break in a second and take a lot longer to put back together — this is that story.",
    thumb: "/assets/reel-5-thumb.jpg",
    video: "/assets/reel-5.mp4"
  }
];

// Shared view-transition-name used to morph a clicked thumbnail into the
// full-screen reel panel (and back again). Only one element in the DOM may
// carry this name at any instant — see openReel/closeReel below for how
// that hand-off is choreographed.
const REEL_MORPH_NAME = 'reel-hero-morph';

// Posters data — single source of truth for both the two featured posters
// in the Creative Journey cards (indices 0 & 1) and the "View more posters"
// mosaic (all six). Keeping one array means a click anywhere always maps
// to the same index, so the morph + prev/next navigation stay in sync.
const postersData = [
  {
    tag: "POSTER MAKING",
    title: "Visual storytelling, framed.",
    desc: "Editorial poster blending warm vintage textures with clean, minimalist layout.",
    src: "/assets/poster1.png"
  },
  {
    tag: "POSTER MAKING",
    title: "Layouts that hold a mood.",
    desc: "A typographic study in color-led composition, made for print and digital lookbooks.",
    src: "/assets/poster2.png"
  },
  {
    tag: "POSTER MAKING",
    title: "Poster Study 03",
    desc: "Part of an ongoing archive of editorial print and layout explorations.",
    src: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80"
  },
  {
    tag: "POSTER MAKING",
    title: "Poster Study 04",
    desc: "Grid alignment and color story, designed to capture an everyday statement.",
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
  },
  {
    tag: "POSTER MAKING",
    title: "Poster Study 05",
    desc: "Warm paper texture meets organic vector shape in this print study.",
    src: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80"
  },
  {
    tag: "POSTER MAKING",
    title: "Poster Study 06",
    desc: "Another piece from the same visual language, built for physical print.",
    src: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?auto=format&fit=crop&w=800&q=80"
  }
];

// Shared view-transition-name for the poster morph — same pattern as
// REEL_MORPH_NAME above, just for images instead of video.
const POSTER_MORPH_NAME = 'poster-hero-morph';

export default function App() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);
  const [activeGallery, setActiveGallery] = useState(null);

  // Poster viewer — same index-based pattern as the reel viewer below,
  // so next/prev can step through postersData while the modal stays open.
  const [activePosterIndex, setActivePosterIndex] = useState(null);
  const [posterNavDirection, setPosterNavDirection] = useState(null); // 'next' | 'prev' | null
  const posterPanelRef = useRef(null);
  const posterTouchStartXRef = useRef(null);

  // Reels viewer is index-based (not a raw src string) so we can navigate
  // next/prev between entries while the modal stays open.
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  const [navDirection, setNavDirection] = useState(null); // 'next' | 'prev' | null
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // While true, the modal shows a static poster instead of the live <video>.
  // This matters specifically during the open morph: the View Transition
  // API animates a *screenshot* crossfade, so the real video is invisible
  // anyway for that ~0.5s — mounting it with autoplay during that window
  // just makes it compete with the animation for the main thread (and some
  // browsers throttle decode on a not-yet-painted element), which is what
  // was causing the long freeze right after the panel reached full size.
  // Deferring the real video until the transition is actually finished
  // means it starts decoding exactly when it's first visible, not before.
  const [isMorphing, setIsMorphing] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const bufferingTimeoutRef = useRef(null);

  // Desktop-only silent hover preview on the reels grid
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const hoverVideoRefs = useRef({});
  const supportsHoverRef = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );

  const butterflyRef = useRef(null);
  const videoRef = useRef(null);
  const panelRef = useRef(null);
  const progressTrackRef = useRef(null);
  const progressFillRef = useRef(null);
  const progressRafRef = useRef(null);
  const touchStartYRef = useRef(null);
  const navLinksRef = useRef(null);
  const hamburgerRef = useRef(null);

  const activeReel = activeReelIndex !== null ? reelsData[activeReelIndex] : null;
  const activeVideo = activeReel ? activeReel.video : null;

  const activePoster = activePosterIndex !== null ? postersData[activePosterIndex] : null;

  // References for scroll spy
  const sectionIds = ['hero', 'journey', 'reels', 'contact'];

  // Handle Scroll Spy & Navbar Scroll Styling — throttled with rAF to prevent re-render storms
  useEffect(() => {
    let rafId = null;
    let lastScrolled = false;
    let lastSection = 'hero';

    const handleScroll = () => {
      if (rafId) return; // already scheduled, skip
      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Navbar scroll styling
        const nowScrolled = window.scrollY > 40;
        if (nowScrolled !== lastScrolled) {
          lastScrolled = nowScrolled;
          setScrolled(nowScrolled);
        }

        // Scroll Spy Active Link
        const scrollPos = window.scrollY + 200;
        let currentSection = 'hero';
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el) {
            if (scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
              currentSection = id;
              break;
            }
          }
        }
        if (currentSection !== lastSection) {
          lastSection = currentSection;
          setActiveSection(currentSection);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Intersection Observer for Scroll Reveals
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Butterfly Cursor Companion — works with mouse on desktop AND touch on
  // mobile/tablet. On touch devices there's no persistent "hover" position,
  // so the butterfly simply travels to wherever the last touch landed and
  // settles into its idle float there until the next touch.
  useEffect(() => {
    const bfly = butterflyRef.current;
    if (!bfly) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let bflyX = mouseX;
    let bflyY = mouseY;
    let angle = 0;
    let isMoving = false;
    let idleTimer = null;
    let frameCount = 0;
    let animationFrameId = null;

    const OFFSET_X = 22;
    const OFFSET_Y = -24;
    const FOLLOW_SPEED = 0.065;
    const ANGLE_SPEED = 0.07;

    const markMoving = () => {
      if (bfly.style.opacity !== '0.65') {
        bfly.style.opacity = '0.65';
      }

      if (!isMoving) {
        isMoving = true;
        bfly.classList.remove('idle');
        bfly.classList.add('flying');
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isMoving = false;
        bfly.classList.remove('flying');
        bfly.classList.add('idle');
      }, 180);
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      markMoving();
    };

    const handleTouchMove = (e) => {
      if (!e.touches || !e.touches.length) return;
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      markMoving();
    };

    const handleTouchStart = (e) => {
      handleTouchMove(e);
    };

    const handleMouseLeave = () => {
      bfly.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      bfly.style.opacity = '0.65';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    const animate = () => {
      frameCount++;

      const targetX = mouseX + OFFSET_X;
      const targetY = mouseY + OFFSET_Y;

      // Lerp position
      const dx = targetX - bflyX;
      const dy = targetY - bflyY;
      bflyX += dx * FOLLOW_SPEED;
      bflyY += dy * FOLLOW_SPEED;

      // Lerp angle
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.5) {
        const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        let diff = targetAngle - angle;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        angle += diff * ANGLE_SPEED;
      }

      // Idle float (sine waves)
      let floatOffsetX = 0;
      let floatOffsetY = 0;
      if (!isMoving) {
        const t = frameCount * 0.02;
        floatOffsetX = Math.sin(t * 0.7) * 6;
        floatOffsetY = Math.sin(t) * 8 + Math.cos(t * 1.3) * 3;
      }

      // HIGH PERFORMANCE: update via translate3d to bypass Layout stage completely
      bfly.style.transform = `translate3d(${bflyX + floatOffsetX}px, ${bflyY + floatOffsetY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(idleTimer);
    };
  }, []);

  // Modal/video scrolling lock
  useEffect(() => {
    if (activeGallery || activeReelIndex !== null || activePosterIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeGallery, activeReelIndex, activePosterIndex]);

  // Reset mute state to muted every time a new reel is opened (matches real Reels UX)
  useEffect(() => {
    if (activeReelIndex !== null) setIsMuted(true);
  }, [activeReelIndex]);

  // Track native fullscreen state (covers ESC, browser chrome exit button, etc.
  // — not just our own toggle button — so the icon and layout always match reality)
  useEffect(() => {
    const handleFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Exit fullscreen automatically if the reel is closed while fullscreen is active
  useEffect(() => {
    if (activeReelIndex === null) {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    }
  }, [activeReelIndex]);

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    const panel = panelRef.current;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;

    if (!fsEl) {
      if (panel && panel.requestFullscreen) {
        panel.requestFullscreen().catch(() => {});
      } else if (panel && panel.webkitRequestFullscreen) {
        panel.webkitRequestFullscreen();
      } else if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
        // iOS Safari has no element-level Fullscreen API — this is the one
        // graceful fallback it supports, native video chrome, no custom UI
        videoRef.current.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };

  // Buffering indicator — only surfaces if the video hasn't started playing
  // within ~220ms of becoming the live element. Short-circuits itself the
  // instant playback actually begins, so a fast start never flashes it.
  // Deferred play: the video mounts WITHOUT autoPlay. This effect waits
  // one animation frame after mount so the browser can composite the poster
  // frame first, then kicks off playback on the next frame. This prevents
  // the decode+play from competing with the mount paint for main-thread time,
  // which was the actual source of the open-moment stutter.
  useEffect(() => {
    if (!activeVideo || isMorphing) return;
    const v = videoRef.current;
    if (!v) return;

    const rafId = requestAnimationFrame(() => {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeVideo, isMorphing, activeReelIndex]);

  useEffect(() => {
    if (!activeVideo || isMorphing) {
      setIsBuffering(false);
      return;
    }
    const v = videoRef.current;
    if (!v) return;

    clearTimeout(bufferingTimeoutRef.current);
    bufferingTimeoutRef.current = setTimeout(() => setIsBuffering(true), 220);

    const clearBuffering = () => {
      clearTimeout(bufferingTimeoutRef.current);
      setIsBuffering(false);
    };

    v.addEventListener('playing', clearBuffering);
    v.addEventListener('canplay', clearBuffering);
    v.addEventListener('waiting', () => setIsBuffering(true));

    return () => {
      clearTimeout(bufferingTimeoutRef.current);
      v.removeEventListener('playing', clearBuffering);
      v.removeEventListener('canplay', clearBuffering);
    };
  }, [activeVideo, isMorphing, activeReelIndex]);

  // Buttery-smooth progress bar: driven by requestAnimationFrame + direct DOM writes
  // instead of React state + the native 'timeupdate' event (which only fires a few
  // times a second and looks jumpy). This mirrors the butterfly-cursor pattern above.
  //
  // Depends on isMorphing (not just activeVideo): while morphing is true the
  // real <video> hasn't mounted yet (videoRef.current is null, the poster
  // <img> is showing instead), so this effect would fire once, find no
  // video, and bail — then never fire again once the video actually mounts,
  // because activeVideo itself never changed value. Including isMorphing
  // forces a fresh run the instant the real video appears.
  useEffect(() => {
    if (!activeVideo || isMorphing) return;
    const v = videoRef.current;
    if (!v) return;

    if (progressFillRef.current) progressFillRef.current.style.width = '0%';

    const tick = () => {
      if (v.duration) {
        const ratio = v.currentTime / v.duration;
        if (progressFillRef.current) {
          progressFillRef.current.style.width = `${ratio * 100}%`;
        }
      }
      progressRafRef.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!progressRafRef.current) progressRafRef.current = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      if (progressRafRef.current) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };

    v.addEventListener('play', startLoop);
    v.addEventListener('pause', stopLoop);
    v.addEventListener('ended', stopLoop);

    // video may already be playing by the time this effect runs
    if (!v.paused) startLoop();

    return () => {
      v.removeEventListener('play', startLoop);
      v.removeEventListener('pause', stopLoop);
      v.removeEventListener('ended', stopLoop);
      stopLoop();
    };
  }, [activeVideo, isMorphing, activeReelIndex]);

  // Seek-bar drag/tap handling — works for both mouse and touch
  const seekToClientX = (clientX) => {
    const track = progressTrackRef.current;
    const v = videoRef.current;
    if (!track || !v || !v.duration) return;
    const rect = track.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.min(Math.max(ratio, 0), 1);
    v.currentTime = ratio * v.duration;
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${ratio * 100}%`;
    }
  };

  const handleProgressPointerDown = (e) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX);

    const handleMove = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      seekToClientX(x);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  // ---------------------------------------------------------------------
  // Reel viewer open/close/navigate — the signature interaction.
  //
  // Opening/closing uses the native View Transitions API so the clicked
  // grid thumbnail visually morphs into the full-screen panel (and back
  // again on close), instead of a modal simply popping into existence.
  // Browsers without support (fallback path) just swap state directly —
  // functionally identical, minus the morph animation.
  // ---------------------------------------------------------------------

  const openReel = (idx) => {
    const reel = reelsData[idx];
    if (!reel || !reel.video) return;

    // Reset hover preview state to immediately pause any thumbnail video playback
    clearTimeout(hoverTimeoutRef.current);
    setHoveredIdx(null);

    const thumbEl = document.querySelector(`[data-reel-idx="${idx}"]`);

    if (!document.startViewTransition || !thumbEl) {
      // No View Transition support — nothing hides the video, so it's
      // safe (and best) to show it live immediately, same as before.
      setNavDirection(null);
      setIsMorphing(false);
      setActiveReelIndex(idx);
      return;
    }

    // Old-state capture happens the instant startViewTransition is called,
    // so the thumbnail needs the shared name applied *before* that call.
    thumbEl.style.viewTransitionName = REEL_MORPH_NAME;

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setNavDirection(null);
        setIsMorphing(true); // show the poster only — see state comment above
        setActiveReelIndex(idx);
      });
      // New-state capture happens right after this callback returns, so
      // hand the name off to the (now-mounted) panel by clearing it here —
      // the panel itself carries the name permanently via inline style.
      thumbEl.style.viewTransitionName = '';
    });

    // The morph animation is done and the live DOM is now the thing on
    // screen — this is the right moment to swap the poster for the real,
    // autoplaying video, not a moment earlier.
    transition.finished.finally(() => {
      setIsMorphing(false);
    });
  };

  const closeReel = () => {
    if (activeReelIndex === null) return;

    // Pause the video immediately so it stops decoding/rendering frames during the transition
    if (videoRef.current) {
      videoRef.current.pause();
    }

    const thumbEl = document.querySelector(`[data-reel-idx="${activeReelIndex}"]`);

    if (!document.startViewTransition) {
      setActiveReelIndex(null);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => setActiveReelIndex(null));
      // Hand the shared name back to the grid thumbnail so the panel
      // morphs down into its resting position instead of just fading.
      if (thumbEl) thumbEl.style.viewTransitionName = REEL_MORPH_NAME;
    });

    transition.finished.finally(() => {
      if (thumbEl) thumbEl.style.viewTransitionName = '';
    });
  };

  const goToReel = (newIdx, direction) => {
    if (!reelsData[newIdx] || !reelsData[newIdx].video) return;
    setNavDirection(direction);
    setIsMorphing(false); // already on screen, no transition hiding it — show live immediately
    setActiveReelIndex(newIdx);
  };

  const goNextReel = () => {
    if (activeReelIndex === null) return;
    goToReel((activeReelIndex + 1) % reelsData.length, 'next');
  };

  const goPrevReel = () => {
    if (activeReelIndex === null) return;
    goToReel((activeReelIndex - 1 + reelsData.length) % reelsData.length, 'prev');
  };

  // Swipe up/down to move between reels (mirrors Reels/TikTok feed gestures)
  const handlePanelTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handlePanelTouchEnd = (e) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const SWIPE_THRESHOLD = 55;
    if (deltaY < -SWIPE_THRESHOLD) goNextReel();
    else if (deltaY > SWIPE_THRESHOLD) goPrevReel();
    touchStartYRef.current = null;
  };

  // ---------------------------------------------------------------------
  // Poster viewer open/close/navigate — same View Transitions morph as
  // the reel viewer above, so a clicked poster thumbnail (in a Journey
  // card, or in the "View more posters" mosaic) grows into the full
  // framed view instead of a modal simply appearing. Images decode
  // instantly (no autoplay/buffering race like video), so this version
  // skips the isMorphing/poster-frame-swap step the reel viewer needs.
  // ---------------------------------------------------------------------

  const openPoster = (idx) => {
    const poster = postersData[idx];
    if (!poster) return;

    const thumbEl = document.querySelector(`[data-poster-idx="${idx}"]`);

    if (!document.startViewTransition || !thumbEl) {
      setPosterNavDirection(null);
      setActivePosterIndex(idx);
      return;
    }

    thumbEl.style.viewTransitionName = POSTER_MORPH_NAME;

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setPosterNavDirection(null);
        setActivePosterIndex(idx);
      });
      thumbEl.style.viewTransitionName = '';
    });

    transition.finished.catch(() => {});
  };

  const closePoster = () => {
    if (activePosterIndex === null) return;

    const thumbEl = document.querySelector(`[data-poster-idx="${activePosterIndex}"]`);

    if (!document.startViewTransition) {
      setActivePosterIndex(null);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => setActivePosterIndex(null));
      if (thumbEl) thumbEl.style.viewTransitionName = POSTER_MORPH_NAME;
    });

    transition.finished.finally(() => {
      if (thumbEl) thumbEl.style.viewTransitionName = '';
    });
  };

  const goToPoster = (newIdx, direction) => {
    if (!postersData[newIdx]) return;
    setPosterNavDirection(direction);
    setActivePosterIndex(newIdx);
  };

  const goNextPoster = () => {
    if (activePosterIndex === null) return;
    goToPoster((activePosterIndex + 1) % postersData.length, 'next');
  };

  const goPrevPoster = () => {
    if (activePosterIndex === null) return;
    goToPoster((activePosterIndex - 1 + postersData.length) % postersData.length, 'prev');
  };

  // Swipe left/right to move between posters
  const handlePosterTouchStart = (e) => {
    posterTouchStartXRef.current = e.touches[0].clientX;
  };
  const handlePosterTouchEnd = (e) => {
    if (posterTouchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - posterTouchStartXRef.current;
    const SWIPE_THRESHOLD = 55;
    if (deltaX < -SWIPE_THRESHOLD) goNextPoster();
    else if (deltaX > SWIPE_THRESHOLD) goPrevPoster();
    posterTouchStartXRef.current = null;
  };

  // Close modals on escape key; arrow keys navigate an open reel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // If fullscreen is active, let the browser's native Escape handling
        // exit fullscreen on its own; don't also close the modal in the same
        // keystroke, or it reads as two things happening at once.
        if (document.fullscreenElement || document.webkitFullscreenElement) return;
        if (activeReelIndex !== null) closeReel();
        if (activePosterIndex !== null) closePoster();
        if (activeGallery) setActiveGallery(null);
        return;
      }
      if (activeReelIndex !== null) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          goNextReel();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          goPrevReel();
        }
      } else if (activePosterIndex !== null) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goNextPoster();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goPrevPoster();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, activeGallery, activePosterIndex]);

  // ---------------------------------------------------------------------
  // Desktop hover preview — a short delay after the cursor lands on a
  // card, the thumbnail cross-fades into a silent looping video preview.
  // ---------------------------------------------------------------------

  const handleCardMouseEnter = (idx, hasVideo) => {
    if (!supportsHoverRef.current || !hasVideo) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredIdx(idx), 350);
  };

  const handleCardMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    setHoveredIdx(null);
  };

  useEffect(() => {
    Object.entries(hoverVideoRefs.current).forEach(([idx, vid]) => {
      if (!vid) return;
      if (Number(idx) === hoveredIdx) {
        vid.currentTime = 0;
        const playPromise = vid.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [hoveredIdx]);

  return (
    <>
      {/* Butterfly Cursor Companion — SVG glow filter replaced with CSS drop-shadow for GPU acceleration */}
      <div className="butterfly" id="butterfly" ref={butterflyRef} aria-hidden="true" style={{filter: 'drop-shadow(0 0 4px rgba(184,21,86,0.4))'}}>
        <svg viewBox="0 0 80 80" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <g className="wing-group wing-left">
              <path d="M40 40 C33 28 18 16 13 26 C8 35 24 36 40 40" stroke="rgba(184,21,86,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M40 40 C35 43 22 50 20 43 C18 36 31 38 40 40" stroke="rgba(184,21,86,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
            </g>
            <g className="wing-group wing-right">
              <path d="M40 40 C47 28 62 16 67 26 C72 35 56 36 40 40" stroke="rgba(184,21,86,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M40 40 C45 43 58 50 60 43 C62 36 49 38 40 40" stroke="rgba(184,21,86,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
            </g>
            <line x1="40" y1="28" x2="40" y2="50" stroke="rgba(184,21,86,0.65)" strokeWidth="1.2"/>
            <path d="M40 28 Q35 20 32 17" stroke="rgba(184,21,86,0.55)" strokeWidth="0.9" strokeLinecap="round"/>
            <path d="M40 28 Q45 20 48 17" stroke="rgba(184,21,86,0.55)" strokeWidth="0.9" strokeLinecap="round"/>
            <circle cx="31.5" cy="16.5" r="1.5" fill="rgba(184,21,86,0.5)"/>
            <circle cx="48.5" cy="16.5" r="1.5" fill="rgba(184,21,86,0.5)"/>
          </g>
        </svg>
      </div>

      {/* Blob divs removed from DOM — background gradient is now a static CSS radial-gradient on body */}

      {/* Navigation Navbar */}
      <header className={`navbar ${scrolled ? 'scrolled-active' : ''}`} id="navbar">
        <div className="nav-container">
          <a href="#" className="nav-logo" onClick={() => setIsNavOpen(false)}>LAVANYA</a>

          {/* Backdrop — covers the area the slide-in nav panel doesn't
              (and, on larger screens, is simply hidden via CSS). Tapping
              or clicking anywhere on it closes the mobile menu. */}
          {isNavOpen && (
            <div
              className="nav-backdrop"
              onClick={() => setIsNavOpen(false)}
              aria-hidden="true"
            ></div>
          )}

          <nav
            className={`nav-links ${isNavOpen ? 'open' : ''}`}
            id="navLinks"
            ref={navLinksRef}
            onClick={() => setIsNavOpen(false)}
          >
            <a href="#hero" className={`nav-link ${activeSection === 'hero' ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Home</a>
            <a href="#journey" className={`nav-link ${activeSection === 'journey' ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Crafts</a>
            <a href="#reels" className={`nav-link ${activeSection === 'reels' ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Reels</a>
            <a href="#contact" className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Contact</a>
          </nav>

          <div className="nav-right">
            <div className="nav-socials">
              <a href="https://www.instagram.com/lavanyay.y?igsh=d281OHBmbzZwbDJy" target="_blank" rel="noopener noreferrer" className="social-chip social-chip-ig" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
              <a href="https://www.youtube.com/@lavanyahh.h" target="_blank" rel="noopener noreferrer" className="social-chip social-chip-yt" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
<a
  href="mailto:lavanyac027@gmail.com?subject=Collaboration%20Inquiry"
  target="_self"
  aria-label="Email Lavanya"
>
  <i className="fa-regular fa-envelope"></i>
</a>            </div>
            <button ref={hamburgerRef} className={`hamburger ${isNavOpen ? 'open' : ''}`} id="hamburger" aria-label="Toggle navigation" onClick={() => setIsNavOpen(!isNavOpen)}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Contents */}
      <main className="lookbook-main">
        {/* Hero Section */}
        <section className="hero-section" id="hero">
          <div className="container hero-container">
            <div className="hero-content reveal-on-scroll">
              <h1 className="hero-title">
                LAVANYA<br />
                <span className="italic-serif">crafted.</span>
              </h1>
              <p className="hero-subtitle">
                19-year-old visual creator crafting aesthetic reels, editorial posters, and handmade crochet.<br />
                Made by hand, made to move one frame, one stitch at a time.
              </p>
              <div className="hero-actions">
                <a href="#contact" className="btn btn-primary">Work with me</a>
              </div>
            </div>

            <div className="hero-moodboard">
              <div className="polaroid polaroid-1">
                <img src="/assets/hero1.png" alt="Moodboard image 1" />
              </div>
              <div className="polaroid polaroid-2">
                <img src="/assets/hero4.png" alt="Moodboard image 2" />
              </div>
              <div className="polaroid polaroid-3">
                <img src="/assets/hero2.png" alt="Moodboard image 3" />
              </div>
              <div className="polaroid polaroid-4">
                <img src="/assets/hero3.png" alt="Moodboard image 4" />
              </div>
            </div>
          </div>
        </section>

        {/* Creative Journey Section */}
        <section className="journey-section" id="journey">
          <div className="container">
            <div className="section-header reveal-on-scroll">
              <span className="section-tag">CREATIVE JOURNEY</span>
              <h2 className="section-title">What I make, one piece at a time.</h2>
            </div>

            <div className="journey-grid">
              {/* Journey Item 1: Poster Making */}
              <div className="journey-card reveal-on-scroll">
                <div
                  className="journey-media journey-media-clickable"
                  data-poster-idx={0}
                  onClick={() => openPoster(0)}
                  role="button"
                  tabIndex={0}
                  aria-label="View full poster: Visual storytelling, framed."
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoster(0); } }}
                >
                  <img src="/assets/poster1.png" alt="Aesthetic Poster Design" className="journey-img" />
                  <div className="poster-zoom-badge"><i className="fa-solid fa-expand"></i></div>
                </div>
                <div className="journey-content">
                  <span className="journey-category">HAND-DRAWN ILLUSTRATION</span>
                  <h3 className="journey-hook">Where symmetry meets silence.</h3>
                  <p className="journey-desc">
                    A hand-drawn composition built through repeated patterns, fine details, and balanced symmetry. Every section was created slowly, one line at a time.
                  </p>
                </div>
              </div>

              {/* Journey Item 2: More Poster Work */}
              <div className="journey-card reveal-on-scroll">
                <div
                  className="journey-media journey-media-clickable"
                  data-poster-idx={1}
                  onClick={() => openPoster(1)}
                  role="button"
                  tabIndex={0}
                  aria-label="View full poster: Layouts that hold a mood."
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoster(1); } }}
                >
                  <img src="/assets/poster2.png" alt="Editorial Poster Series" className="journey-img" />
                  <div className="poster-zoom-badge"><i className="fa-solid fa-expand"></i></div>
                </div>
                <div className="journey-content">
                  <span className="journey-category">CONCEPT ART</span>
                  <h3 className="journey-hook">Dreams painted beyond the stars.</h3>
                  <p className="journey-desc">
                    A visual interpretation of imagination and emotion, blending celestial colors with expressive silhouettes. Every piece tells a story where thoughts become galaxies and creativity knows no boundaries.
                  </p>
                  <button type="button" className="journey-cta journey-cta-btn" onClick={() => setActiveGallery(galleryData.posters)}>
                    View more posters <i className="fa-solid fa-arrow-right-long"></i>
                  </button>
                </div>
              </div>

              {/* Journey Item 1 and 2 only are kept. Crochet items deleted. */}
            </div>
          </div>
        </section>

        {/* Reels Gallery Grid */}
        <section className="reels-section" id="reels">
          <div className="container">
            <div className="section-header reveal-on-scroll">
              <span className="section-tag">SELECTED CREATION LOOPS</span>
            </div>

            <div className="reels-grid">
              {reelsData.map((reel, idx) => (
                <div
                  className={`reel-card reveal-on-scroll${reel.video ? ' reel-card-playable' : ''}`}
                  key={idx}
                  onClick={() => reel.video && openReel(idx)}
                  style={reel.video ? { cursor: 'pointer' } : undefined}
                >
                  <div
                    className="reel-thumb-wrapper"
                    data-reel-idx={idx}
                    onMouseEnter={() => handleCardMouseEnter(idx, !!reel.video)}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    <img src={reel.thumb} alt={reel.title} className="reel-thumb" />
                    {reel.video && (
                      <video
                        ref={(el) => { hoverVideoRefs.current[idx] = el; }}
                        className={`reel-hover-preview ${hoveredIdx === idx ? 'active' : ''}`}
                        src={reel.video}
                        poster={reel.thumb}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    )}
                    <div className="reel-badge"><i className="fa-solid fa-play"></i></div>
                  </div>
                  <div className="reel-meta">
                    <span className="reel-num">{reel.num}</span>
                    <h3 className="reel-title">{reel.title}</h3>
                    <p className="reel-desc">{reel.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Unified Bio & Contact Footer */}
      <footer className="footer reveal-on-scroll" id="contact">
        <div className="container footer-container">
          <div className="footer-left-col">
            <h2 className="bio-title">If you're a brand looking to collaborate or need a creative eye on your next project then let's make something worth keeping.</h2>
            <div className="bio-niches">
              <span>Posters</span>
              <span className="bullet">•</span>
              <span>Transitions</span>
              <span className="bullet">•</span>
              <span>Reels</span>
            </div>
          </div>

          <div className="footer-right-col">
            {/* Repositioned Social links with logo icons, aligned perfectly with tag height */}
            <div className="footer-contact-header">
              <span className="footer-tag">LET'S COLLABORATE</span>
              <div className="footer-header-socials">
                <a href="https://www.instagram.com/lavanyay.y?igsh=d281OHBmbzZwbDJy" target="_blank" rel="noopener noreferrer" className="social-chip social-chip-ig" aria-label="Instagram">
                  <i className="fa-brands fa-instagram"></i> <span className="social-chip-label">Instagram</span>
                </a>
                <a href="https://www.youtube.com/@lavanyahh.h" target="_blank" rel="noopener noreferrer" className="social-chip social-chip-yt" aria-label="YouTube">
                  <i className="fa-brands fa-youtube"></i> <span className="social-chip-label">YouTube</span>
                </a>
              </div>
            </div>
            
            <div className="contact-card">
              <h2 className="footer-email-title">
                <a href="mailto:lavanyac027@gmail.com" className="email-link">lavanyac027@gmail.com</a>
              </h2>
              <p className="footer-desc">For brand sponsorships, collaborations, or custom design queries.</p>
              
              <div className="contact-button-wrapper">
                <a href="mailto:lavanyac027@gmail.com" className="btn btn-primary contact-btn" aria-label="Send email to Lavanya">
                  <i className="fa-regular fa-envelope"></i> Click to Email Me
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container footer-bottom">
          <p className="copyright">&copy; {new Date().getFullYear()} Lavanya. All rights reserved.</p>
        </div>
      </footer>

      {/* Gallery Modal */}
      {activeGallery && (
        <div className="gallery-modal open" role="dialog" aria-modal="true">
          <div className="gallery-modal-backdrop" onClick={() => setActiveGallery(null)}></div>
          <div className="gallery-modal-panel">
            <button type="button" className="gallery-modal-close" onClick={() => setActiveGallery(null)} aria-label="Close gallery">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="gallery-modal-header">
              <span className="gallery-modal-tag">{activeGallery.tag}</span>
              <h3 className="gallery-modal-title">{activeGallery.title}</h3>
            </div>
            <div className="gallery-modal-grid">
              {postersData.map((poster, idx) => (
                <div
                  className="gallery-item-wrapper"
                  key={idx}
                  data-poster-idx={idx}
                  onClick={() => openPoster(idx)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View full poster: ${poster.title}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoster(idx); } }}
                >
                  <img src={poster.src} alt={poster.title} />
                  <div className="gallery-item-badge"><i className="fa-solid fa-expand"></i></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Modal — Reel style, morphs from the clicked grid thumbnail */}
      {activeReel && (
        <div className="video-modal open" role="dialog" aria-modal="true" aria-label={activeReel.title}>
          <div className="video-modal-backdrop" onClick={closeReel}></div>
          <div
            className={`video-modal-panel reel-style ${isMorphing ? 'is-morphing' : ''}`}
            ref={panelRef}
            style={{ viewTransitionName: REEL_MORPH_NAME }}
            data-nav-dir={navDirection || undefined}
            onTouchStart={handlePanelTouchStart}
            onTouchEnd={handlePanelTouchEnd}
          >
            <button
              type="button"
              className="video-modal-close"
              onClick={closeReel}
              aria-label="Close video"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <button
              type="button"
              className="video-fullscreen-toggle"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
            >
              <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>

            <div className="reel-counter">
              {String(activeReelIndex + 1).padStart(2, '0')} / {String(reelsData.length).padStart(2, '0')}
            </div>

            <div className="reel-nav-controls">
              <button type="button" className="reel-nav-btn" onClick={goPrevReel} aria-label="Previous reel">
                <i className="fa-solid fa-chevron-up"></i>
              </button>
              <button type="button" className="reel-nav-btn" onClick={goNextReel} aria-label="Next reel">
                <i className="fa-solid fa-chevron-down"></i>
              </button>
            </div>

            <button
              type="button"
              className="video-mute-toggle"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
            </button>

            <video
              key={activeReelIndex}
              ref={videoRef}
              src={isMorphing ? null : activeVideo}
              poster={activeReel.thumb}
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onClick={(e) => {
                const v = e.currentTarget;
                if (v.paused) v.play(); else v.pause();
              }}
              className="reel-video"
            />

            {isBuffering && !isMorphing && (
              <div className="reel-buffering" aria-hidden="true">
                <span></span><span></span><span></span>
              </div>
            )}

            <div className="reel-modal-info">
              <h3 className="reel-modal-title">{activeReel.title}</h3>
              <p className="reel-modal-desc">{activeReel.desc}</p>
            </div>

            <div
              className="reel-progress-track"
              ref={progressTrackRef}
              onMouseDown={handleProgressPointerDown}
              onTouchStart={handleProgressPointerDown}
            >
              <div className="reel-progress-bg"></div>
              <div className="reel-progress-fill" ref={progressFillRef}></div>
            </div>
          </div>
        </div>
      )}

      {/* Poster Modal — morphs from the clicked poster thumbnail, same
          View Transitions technique as the reel viewer, but framed like a
          portrait print instead of a vertical video (4:5 mat, not 9:16). */}
      {activePoster && (
        <div className="poster-modal open" role="dialog" aria-modal="true" aria-label={activePoster.title}>
          <div className="poster-modal-backdrop" onClick={closePoster}></div>
          <div
            className="poster-modal-panel"
            ref={posterPanelRef}
            style={{ viewTransitionName: POSTER_MORPH_NAME }}
            data-nav-dir={posterNavDirection || undefined}
            onTouchStart={handlePosterTouchStart}
            onTouchEnd={handlePosterTouchEnd}
          >
            <button
              type="button"
              className="poster-modal-close"
              onClick={closePoster}
              aria-label="Close poster"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div className="poster-counter">
              {String(activePosterIndex + 1).padStart(2, '0')} / {String(postersData.length).padStart(2, '0')}
            </div>

            <button type="button" className="poster-nav-btn poster-nav-prev" onClick={goPrevPoster} aria-label="Previous poster">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" className="poster-nav-btn poster-nav-next" onClick={goNextPoster} aria-label="Next poster">
              <i className="fa-solid fa-chevron-right"></i>
            </button>

            <div className="poster-frame" key={activePosterIndex}>
              <img src={activePoster.src} alt={activePoster.title} className="poster-frame-img" />
            </div>

            <div className="poster-modal-info">
              <span className="poster-modal-tag">{activePoster.tag}</span>
              <h3 className="poster-modal-title">{activePoster.title}</h3>
              <p className="poster-modal-desc">{activePoster.desc}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}