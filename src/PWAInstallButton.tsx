import React, { useState } from 'react';
import { Download, Share, X, PlusSquare, Compass } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress completely if already installed and running standalone
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow (only when browser triggered beforeinstallprompt)
  if (isInstallable) {
    return (
      <div className="pwa-install-wrap">
        <button
          type="button"
          onClick={install}
          className="pwa-install-btn"
          title="Install Vireon Habit System to your home screen or desktop"
          aria-label="Install Vireon Habit System app"
        >
          <Download size={13} className="pwa-icon" />
          <span>Install App</span>
        </button>
      </div>
    );
  }

  // iOS Safari flow (WebKit does not support beforeinstallprompt)
  if (isIOS) {
    return (
      <div className="pwa-install-wrap">
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="pwa-install-btn pwa-ios-btn"
          title="How to install Vireon Habit System on iPhone or iPad"
          aria-label="Install Vireon Habit System on iPhone or iPad"
        >
          <Share size={13} className="pwa-icon" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <section
              className="dialog pwa-ios-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-ios-title"
            >
              <button
                type="button"
                className="dialog-close"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close installation instructions"
              >
                <X size={18} />
              </button>
              <span className="eyebrow">INSTALL TO HOME SCREEN</span>
              <h2 id="pwa-ios-title">Install on iPhone & iPad</h2>
              <p className="dialog-intro">
                Run Vireon Habit System full-screen like a native app with fast offline loading and instant access from your home screen.
              </p>

              <div className="pwa-steps-list">
                <div className="pwa-step-card">
                  <div className="pwa-step-num">1</div>
                  <div className="pwa-step-content">
                    <strong>Use Apple Safari</strong>
                    <p>Open this page in <strong>Safari</strong> (Apple does not permit Chrome or Firefox to install web apps on iOS).</p>
                  </div>
                  <Compass size={18} className="pwa-step-icon" />
                </div>

                <div className="pwa-step-card">
                  <div className="pwa-step-num">2</div>
                  <div className="pwa-step-content">
                    <strong>Tap the Share Button</strong>
                    <p>Tap the <strong>Share</strong> button <Share size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> in the bottom navigation bar.</p>
                  </div>
                  <Share size={18} className="pwa-step-icon" />
                </div>

                <div className="pwa-step-card">
                  <div className="pwa-step-num">3</div>
                  <div className="pwa-step-content">
                    <strong>Select “Add to Home Screen”</strong>
                    <p>Scroll down the share sheet menu and tap <strong>Add to Home Screen</strong>.</p>
                  </div>
                  <PlusSquare size={18} className="pwa-step-icon" />
                </div>

                <div className="pwa-step-card">
                  <div className="pwa-step-num">4</div>
                  <div className="pwa-step-content">
                    <strong>Tap “Add”</strong>
                    <p>Tap <strong>Add</strong> in the top-right corner to place Vireon Habit System directly onto your home screen.</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="primary-button full-button"
                onClick={() => setShowIOSGuide(false)}
              >
                Got It
              </button>
            </section>
          </div>
        )}
      </div>
    );
  }

  return null;
};
