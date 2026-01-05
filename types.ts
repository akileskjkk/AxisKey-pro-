
export type ControlType = 'TAP' | 'WASD' | 'VISTA' | 'FIRE' | 'MACRO' | 'SWIPE' | 'SMART_AIM';

export type ActivationStatus = 'INACTIVE' | 'PENDING' | 'ACTIVE' | 'ERROR' | 'SHIZUKU_WAITING' | 'PAIRING_REQUIRED';

export interface MacroStep {
  id: string;
  key: string;
  delay: number; // ms
}

export interface MappingControl {
  id: string;
  type: ControlType;
  x: number; 
  y: number; 
  key: string;
  label?: string;
  size?: number;
  opacity?: number;
  bgColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  macroSteps?: MacroStep[];
  swipeDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

export interface SensitivitySettings {
  xSensitivity: number;
  ySensitivity: number;
  tweaks: number;
  lookSpeed: number;
  acceleration: boolean;
  accelerationMultiplier: number;
  deadZone: number;
  scanRate: number;
  smoothing: number;
  mousePollingRate: 125 | 250 | 500 | 1000 | 2000;
}

export interface MappingProfile {
  id: string;
  name: string;
  controls: MappingControl[];
  sensitivity: SensitivitySettings;
  backgroundUrl: string | null;
  lastModified: string;
}

export interface DeviceHardware {
  cpuCores: number;
  gpuRenderer: string;
  gpuVendor: string;
  androidVersion: string;
  deviceName: string;
  refreshRate: number;
  ramEstimate?: string;
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  packageId: string;
  profile: MappingProfile;
  compatibility: number;
}

export interface AppConfig {
  showOnboarding: boolean;
  themeColor: string;
  language: 'pt-BR' | 'en-US';
  hapticFeedback: boolean;
  showFps: boolean;
  activationStatus: ActivationStatus;
  activationMethod: 'SHIZUKU' | 'WIRELESS_DEBUG' | 'NONE';
}
