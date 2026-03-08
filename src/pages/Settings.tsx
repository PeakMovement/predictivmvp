import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { TonePreferenceSettings } from "@/components/settings/TonePreferenceSettings";
import { DevicesSettings } from "@/components/settings/DevicesSettings";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { InjuryProfileSettings } from "@/components/settings/InjuryProfileSettings";
import { PractitionerAccessSettings } from "@/components/settings/PractitionerAccessSettings";
import { YvesMemorySettings } from "@/components/settings/YvesMemorySettings";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { useToast } from "@/hooks/use-toast";

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
  const { toast } = useToast();

  // Show feedback toast after Garmin OAuth redirect back to /settings
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const garminConnected = params.get("garmin_connected");
    const garminError = params.get("garmin_error");

    if (garminConnected === "true") {
      toast({ title: "Garmin Connected", description: "Your Garmin account is now linked and syncing." });
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    } else if (garminError) {
      const messages: Record<string, string> = {
        invalid_state: "OAuth session expired — please try connecting again.",
        state_expired: "OAuth session expired — please try connecting again.",
        code_expired: "Authorization code expired — please try connecting again.",
        invalid_credentials: "Garmin credentials misconfigured. Contact support.",
        server_config: "Server configuration error. Contact support.",
        invalid_user: "Invalid user session. Please log out and back in.",
        token_exchange_failed: "Token exchange failed — please try connecting again.",
        access_denied: "Garmin access was denied.",
      };
      toast({
        title: "Garmin Connection Failed",
        description: messages[garminError] ?? `Error: ${garminError}`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    previewMode,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization("profile");

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
        </div>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        <LayoutBlock blockId="profile" displayName="Profile" pageId="profile" size="standard" visible={isSectionVisible("profile")}>
          <ProfileSettings />
        </LayoutBlock>

        <LayoutBlock blockId="tone" displayName="Communication Tone" pageId="profile" size="standard" visible={isSectionVisible("tone")}>
          <TonePreferenceSettings />
        </LayoutBlock>

        <DevicesSettings isSectionVisible={isSectionVisible} />

        <NotificationsSettings isSectionVisible={isSectionVisible} onNavigate={onNavigate} />

        <LayoutBlock blockId="injuryProfile" displayName="Injury Profile" pageId="profile" size="standard" visible={isSectionVisible("injuryProfile")}>
          <InjuryProfileSettings />
        </LayoutBlock>

        <LayoutBlock blockId="practitionerAccess" displayName="Practitioner Access" pageId="profile" size="standard" visible={isSectionVisible("practitionerAccess")}>
          <PractitionerAccessSettings />
        </LayoutBlock>

        <LayoutBlock blockId="appearance" displayName="Appearance" pageId="profile" size="standard" visible={isSectionVisible("appearance")}>
          <AppearanceSettings />
        </LayoutBlock>

        <LayoutBlock blockId="yvesMemory" displayName="Yves Memory" pageId="profile" size="standard" visible={isSectionVisible("yvesMemory")}>
          <YvesMemorySettings />
        </LayoutBlock>

        <AccountSettings isSectionVisible={isSectionVisible} onNavigate={onNavigate} />
      </div>

      {isLayoutEditing && (
        <div className="mt-8">
          <LayoutEditor
            sections={editingSections}
            previewMode={previewMode}
            onSave={saveLayout}
            onCancel={closeLayoutEditor}
            onReset={resetToDefault}
            onToggleVisibility={toggleSectionVisibility}
            onToggleCollapseByDefault={toggleCollapseByDefault}
            onTogglePreviewMode={togglePreviewMode}
            onMoveUp={moveSectionUp}
            onMoveDown={moveSectionDown}
            onReorder={reorderSections}
          />
        </div>
      )}
    </div>
  );
};
