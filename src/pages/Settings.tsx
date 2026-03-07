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
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
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
