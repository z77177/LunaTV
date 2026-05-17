import { useState, useEffect } from 'react';

interface ImmersiveSettings {
  enabled: boolean;
  opacity: number;
  hideTimeout: number; // in milliseconds
}

const IS_FEATURE_DISABLED = process.env.NEXT_PUBLIC_ENABLE_IMMERSIVE_PLAYER === 'false';

const DEFAULT_SETTINGS: ImmersiveSettings = {
  enabled: !IS_FEATURE_DISABLED,
  opacity: 0.85, // 85% opacity by default, won't go below 0.05 (5%)
  hideTimeout: 3000, // 3 seconds by default
};

export function useImmersiveMode() {
  const [settings, setSettings] = useState<ImmersiveSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount and listen to changes
  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem('immersive_player_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({
            enabled: IS_FEATURE_DISABLED ? false : (parsed.enabled ?? DEFAULT_SETTINGS.enabled),
            opacity: parsed.opacity !== undefined ? Math.max(0.05, Math.min(1, parsed.opacity)) : DEFAULT_SETTINGS.opacity,
            hideTimeout: parsed.hideTimeout ?? DEFAULT_SETTINGS.hideTimeout,
          });
        } else if (IS_FEATURE_DISABLED) {
          setSettings(prev => ({ ...prev, enabled: false }));
        }
      } catch (e) {
        console.warn('Failed to load immersive settings', e);
      }
    };
    
    loadSettings();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'immersive_player_settings') {
        loadSettings();
      }
    };
    
    // Custom event for same-window updates
    const handleCustomUpdate = () => loadSettings();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('immersive_settings_updated', handleCustomUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('immersive_settings_updated', handleCustomUpdate);
    };
  }, []);

  // Update specific setting and save to localStorage
  const updateSetting = <K extends keyof ImmersiveSettings>(key: K, value: ImmersiveSettings[K]) => {
    if (IS_FEATURE_DISABLED && key === 'enabled') return;
    
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      
      // Enforce bounds
      if (key === 'opacity') {
        newSettings.opacity = Math.max(0.05, Math.min(1, newSettings.opacity as number));
      }
      if (key === 'hideTimeout') {
        newSettings.hideTimeout = Math.max(1000, Math.min(10000, newSettings.hideTimeout as number));
      }
      
      try {
        localStorage.setItem('immersive_player_settings', JSON.stringify(newSettings));
        window.dispatchEvent(new Event('immersive_settings_updated'));
      } catch (e) {
        console.warn('Failed to save immersive settings', e);
      }
      return newSettings;
    });
  };

  const toggleImmersiveMode = () => {
    if (IS_FEATURE_DISABLED) return;
    updateSetting('enabled', !settings.enabled);
  };
  
  return {
    settings,
    isLoaded,
    updateSetting,
    toggleImmersiveMode,
    isFeatureDisabled: IS_FEATURE_DISABLED,
  };
}
