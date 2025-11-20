import { useEffect, useState } from 'react';
import { useBleStore } from '../../store/bleStore';
import { getLastDeviceId, getSelectedGender } from '../../utils/storage';

export type OnboardingStep =
  | 'complete'
  | 'need-connection'
  | 'need-gender'
  | 'need-start';

interface OnboardingStatus {
  isComplete: boolean;
  hasGender: boolean;
  hasDevice: boolean;
  nextRoute: string;
  currentStep: OnboardingStep;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { hasCompletedOnboarding } = useBleStore();
  const [status, setStatus] = useState<OnboardingStatus>({
    isComplete: false,
    hasGender: false,
    hasDevice: false,
    nextRoute: '/welcome',
    currentStep: 'need-start',
  });

  useEffect(() => {
    const gender = getSelectedGender();
    const deviceId = getLastDeviceId();
    const hasGender = !!gender && gender !== 'male';
    const hasDevice = !!deviceId;

    console.log('🔍 Onboarding status:', {
      onboarding: hasCompletedOnboarding,
      gender,
      hasGender,
      deviceId,
      hasDevice,
    });

    let nextRoute = '/welcome';
    let currentStep: OnboardingStep = 'need-start';
    let isComplete = false;

    if (hasCompletedOnboarding && hasGender && hasDevice) {
      nextRoute = '/(main)/race';
      currentStep = 'complete';
      isComplete = true;
    } else if (hasGender && hasDevice && !hasCompletedOnboarding) {
      // User has gender and device but hasn't completed onboarding
      // Should go to start screen to complete the connection
      nextRoute = '/(on-boarding)/start';
      currentStep = 'need-connection';
    } else if (hasGender && !hasDevice) {
      nextRoute = '/(on-boarding)/start';
      currentStep = 'need-connection';
    } else if (!hasGender) {
      nextRoute = '/(on-boarding)/choose';
      currentStep = 'need-gender';
    }

    setStatus({
      isComplete,
      hasGender,
      hasDevice,
      nextRoute,
      currentStep,
    });
  }, [hasCompletedOnboarding]);

  return status;
}