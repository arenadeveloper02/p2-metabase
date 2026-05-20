import { t } from "ttag";
import { uniq } from "underscore";

import { Button } from "metabase/common/components/Button";
import { Link } from "metabase/common/components/Link";
import { Sortable } from "metabase/common/components/Sortable";
import type { TabButtonMenuItem } from "metabase/common/components/TabButton";
import { TabButton } from "metabase/common/components/TabButton";
import { TabRow } from "metabase/common/components/TabRow";
import { useConfirmation } from "metabase/common/hooks/use-confirmation";
import CS from "metabase/css/core/index.css";
import { useDashboardContext } from "metabase/dashboard/context";
import { useRegisterShortcut } from "metabase/palette/hooks/useRegisterShortcut";
import type { SelectedTabId } from "metabase/redux/store";
import { Flex, List } from "metabase/ui";
import { isVirtualDashCard } from "metabase/utils/dashboard";

import S from "./DashboardTabs.module.css";
import { useDashboardTabs } from "./use-dashboard-tabs";

export function DashboardTabs() {
  const { isEditing = false, dashboard } = useDashboardContext();
  const { modalContent, show } = useConfirmation();

  const {
    tabs,
    createNewTab,
    duplicateTab,
    deleteTab,
    setTabShown,
    renameTab,
    selectTab,
    selectedTabId,
    moveTab,
  } = useDashboardTabs();
  const hasMultipleTabs = tabs.length > 1;
  const shownTabsCount = tabs.filter((tab) => tab.is_shown !== false).length;
  const showTabs = hasMultipleTabs || isEditing;
  const showPlaceholder = tabs.length === 0 && isEditing;

  useRegisterShortcut(
    [
      {
        id: "dashboard-change-tab",
        perform: (_, event) => {
          if (!event?.key) {
            return;
          }
          const key = parseInt(event.key);
          const tab = tabs[key - 1];
          if (tab) {
            selectTab(tab.id);
          }
        },
      },
    ],
    [tabs],
  );

  if (!showTabs) {
    return null;
  }

  const baseMenuItems: TabButtonMenuItem[] = [
    {
      label: t`Duplicate`,
      action: (_, value) => duplicateTab(value),
    },
  ];
  const getMenuItems = (tabId: SelectedTabId): TabButtonMenuItem[] => {
    const tab = tabs.find(({ id }) => id === tabId);
    const menuItems = [...baseMenuItems];

    if (tab && hasMultipleTabs) {
      const isShown = tab.is_shown !== false;
      menuItems.push({
        label: isShown ? t`Hide` : t`Unhide`,
        action: () => {
          if (isShown && shownTabsCount <= 1) {
            return;
          }
          setTabShown(tab.id, !isShown);
        },
      });
    }

    if (hasMultipleTabs) {
      menuItems.push({
      label: t`Delete`,
      action: (_, value) => {
        const performDelete = () => deleteTab(value);
        const tabQuestions = dashboard?.dashcards.filter(
          (dashcard) =>
            dashcard.dashboard_tab_id === value && !isVirtualDashCard(dashcard),
        );
        const tabDashboardQuestions = tabQuestions?.filter(
          (dashcard) => dashcard.card.dashboard_id !== null,
        );
        const hasDashboardQuestions = !!tabDashboardQuestions?.length;
        if (!hasDashboardQuestions) {
          performDelete();
          return;
        }
        const areAllDashboardQuestions =
          tabQuestions?.length === tabDashboardQuestions.length;
        show({
          size: areAllDashboardQuestions ? "sm" : undefined,
          title: areAllDashboardQuestions
            ? t`Delete this tab and its charts?`
            : t`Delete this tab?`,
          message: areAllDashboardQuestions ? (
            t`If you'd like to keep any of them, you can move them to a different tab, dashboard, or collection.`
          ) : (
            <>
              {t`This will also delete any questions saved in it. If you'd like to keep any of these, move them to a different tab, dashboard, or collection.`}
              <List ml="md" mt="sm">
                {uniq(tabDashboardQuestions, (dc) => dc.card.id).map(
                  (dashcard) => (
                    <List.Item key={dashcard.card.id}>
                      <Link
                        to={`/question/${dashcard.card.id}`}
                        className={CS.link}
                      >
                        {dashcard.card.name}
                      </Link>
                    </List.Item>
                  ),
                )}
              </List>
            </>
          ),
          confirmButtonText: t`Delete tab`,
          onConfirm: performDelete,
        });
      },
      });
    }

    return menuItems;
  };

  return (
    <Flex align="start" gap="lg" w="100%" className={S.dashboardTabs}>
      <TabRow<SelectedTabId>
        value={selectedTabId}
        onChange={selectTab}
        itemIds={tabs.map((tab) => tab.id)}
        handleDragEnd={moveTab}
      >
        {showPlaceholder ? (
          <TabButton
            label={t`Tab 1`}
            value={null}
            showMenu
            menuItems={baseMenuItems}
          />
        ) : (
          tabs.map((tab) => (
            <Sortable
              key={tab.id}
              id={tab.id}
              disabled={!isEditing}
              role="presentation"
            >
              <TabButton.Renameable
                value={tab.id}
                label={tab.name}
                onRename={(name) => renameTab(tab.id, name)}
                canRename={isEditing && hasMultipleTabs}
                showMenu={isEditing}
                menuItems={getMenuItems(tab.id)}
              />
            </Sortable>
          ))
        )}
        {isEditing && (
          <Button
            icon="add"
            iconSize={12}
            onClick={createNewTab}
            aria-label={t`Create new tab`}
            className={S.createTabButton}
          />
        )}
      </TabRow>
      {modalContent}
    </Flex>
  );
}
