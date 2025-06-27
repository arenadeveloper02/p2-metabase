import React from "react";
import { t } from "ttag";
import { ToolbarButton } from "metabase/components/ToolbarButton";
import { closeSidebar, setSidebar } from "metabase/dashboard/actions";
import { SIDEBAR_NAME } from "metabase/dashboard/constants";
import {
  getDashboardId,
  getIsShowDashboardInfoSidebar,
} from "metabase/dashboard/selectors";
import { useDispatch, useSelector } from "metabase/lib/redux";
import { Modal } from "metabase/ui";
import { LoadingSpinner } from "metabase/common/components/EntityPicker";

export const DashboardBulbButton = () => {
  const [isOpenModalId, setIsOpenModalId] = React.useState<number | string>("");

  let dashboardId = useSelector(getDashboardId);

  const renderModal = (dashboardId?: number | string) => {
    return (
      <Modal
        size="30rem"
        opened={dashboardId === isOpenModalId}
        onClose={() => {
          setIsOpenModalId("");
        }}
        title={t`Render Dashboard Insight`}
      >
        Dashboard level {dashboardId}
        <LoadingSpinner />
      </Modal>
    );
  };


  return (
    <>
      {renderModal(dashboardId || "")}
      <ToolbarButton
        aria-label={t`Insight`}
        tooltipLabel={t`Insight`}
        icon="lightbulb"
        onClick={() => {
          setIsOpenModalId(dashboardId || "");
        }}
      />
    </>
  );
};
