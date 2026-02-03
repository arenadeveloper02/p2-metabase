import { isQuestionOrDashboardExperience } from "metabase/embedding/embedding-iframe-sdk-setup/utils/is-question-or-dashboard-experience";
import { PLUGIN_EMBEDDING_IFRAME_SDK_SETUP } from "metabase/plugins";

import type {
  SdkIframeDashboardEmbedSettings,
  SdkIframeEmbedSetupExperience,
  SdkIframeEmbedSetupGuestEmbedSettings,
  SdkIframeEmbedSetupSettings,
  SdkIframeQuestionEmbedSettings,
} from "../types";

const GET_ENABLE_GUEST_EMBED_SETTINGS: (data: {
  experience: SdkIframeEmbedSetupExperience;
}) => SdkIframeEmbedSetupGuestEmbedSettings &
  Pick<SdkIframeEmbedSetupSettings, "useExistingUserSession"> = ({
  experience,
}) => {
  const isQuestionOrDashboardEmbed =
    isQuestionOrDashboardExperience(experience);

  return {
    ...(isQuestionOrDashboardEmbed
      ? {
          isGuest: true,
          isSso: false,
          useExistingUserSession: false,
          ...(isQuestionOrDashboardEmbed && {
            drills: true,
            withDownloads: true,
            withSubscriptions: true,
          }),
        }
      : {
          isGuest: false,
          isSso: true,
          useExistingUserSession: true,
        }),
    hiddenParameters: [],
  };
};

const GET_DISABLE_GUEST_EMBED_SETTINGS: (data: {
  experience: SdkIframeEmbedSetupExperience;
  isSsoEnabledAndConfigured: boolean;
  useExistingUserSession: boolean;
}) => SdkIframeEmbedSetupGuestEmbedSettings &
  Pick<SdkIframeEmbedSetupSettings, "useExistingUserSession"> &
  Pick<
    SdkIframeDashboardEmbedSettings | SdkIframeQuestionEmbedSettings,
    "lockedParameters"
  > = ({ experience, isSsoEnabledAndConfigured, useExistingUserSession }) => {
  const isQuestionOrDashboardEmbed =
    isQuestionOrDashboardExperience(experience);
  const isQuestionEmbed = experience === "chart";

  return {
    ...(isQuestionOrDashboardEmbed
      ? {
          isGuest: false,
          isSso: true,
          useExistingUserSession:
            !isSsoEnabledAndConfigured || useExistingUserSession,
          drills: true,
        }
      : {
          isGuest: false,
          isSso: true,
          useExistingUserSession:
            !isSsoEnabledAndConfigured || useExistingUserSession,
        }),
    ...(isQuestionEmbed && {
      // Currently, a chart should not have hidden parameters in non-guest embed mode
      hiddenParameters: [],
    }),
  };
};

export const getCommonEmbedSettings = ({
  experience,
  isGuestEmbedsEnabled,
  isSsoEnabledAndConfigured,
  isGuest,
  useExistingUserSession,
}: {
  experience: SdkIframeEmbedSetupExperience;
  isGuestEmbedsEnabled: boolean;
  isSsoEnabledAndConfigured: boolean;
  isGuest: boolean;
  useExistingUserSession: boolean;
}) => {
  const isSimpleEmbedFeatureAvailable =
    PLUGIN_EMBEDDING_IFRAME_SDK_SETUP.isEnabled();

  if (isSimpleEmbedFeatureAvailable) {
    return isGuestEmbedsEnabled && isGuest
      ? GET_ENABLE_GUEST_EMBED_SETTINGS({
          experience,
        })
      : GET_DISABLE_GUEST_EMBED_SETTINGS({
          experience,
          isSsoEnabledAndConfigured,
          useExistingUserSession,
        });
  } else {
    return GET_ENABLE_GUEST_EMBED_SETTINGS({
      experience,
    });
  }
};
