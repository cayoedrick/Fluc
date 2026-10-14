import React, { useEffect, useState } from 'react';

// Declaration to satisfy TypeScript for external Google Picker API
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const useGooglePicker = (onFilePicked: (file: any) => void, accessToken: string | null) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load the Google Picker API script
    if (!document.getElementById('google-picker-script')) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.id = 'google-picker-script';
      script.onload = () => {
        if (window.gapi && typeof window.gapi.load === 'function') {
          window.gapi.load('picker', {
            callback: () => setIsScriptLoaded(true),
          });
        } else {
          // Fallback or retry
          setTimeout(() => setIsScriptLoaded(true), 500);
        }
      };
      document.body.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }
  }, []);

  const openPicker = () => {
    if (!isScriptLoaded || !accessToken) {
      console.error('Picker script not loaded or no access token');
      return;
    }

    const pickerOrigin =
      window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[
            window.location.ancestorOrigins.length - 1
          ]
        : window.location.origin;

    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          onFilePicked(data.docs[0]);
        }
      })
      .setOrigin(pickerOrigin)
      .build();
    picker.setVisible(true);
  };

  return { openPicker, isScriptLoaded };
};
