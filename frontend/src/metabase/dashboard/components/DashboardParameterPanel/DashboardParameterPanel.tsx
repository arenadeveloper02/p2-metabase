import cx from "classnames";
import React,{ useRef, useState } from "react";

import TransitionS from "metabase/css/core/transitions.module.css";
import { DASHBOARD_PARAMETERS_PDF_EXPORT_NODE_ID } from "metabase/dashboard/constants";
import { useIsParameterPanelSticky } from "metabase/dashboard/hooks/use-is-parameter-panel-sticky";
import {
  getDashboardComplete,
  getIsEditing,
  getIsNightMode,
  getParameters,
  getTabHiddenParameterSlugs,
  getValuePopulatedParameters,
} from "metabase/dashboard/selectors";
import { isSmallScreen } from "metabase/lib/dom";
import { useSelector } from "metabase/lib/redux";
import { FilterApplyButton } from "metabase/parameters/components/FilterApplyButton";
import { getVisibleParameters } from "metabase/parameters/utils/ui";

import {
  FixedWidthContainer,
  ParametersFixedWidthContainer,
  ParametersWidgetContainer,
} from "../Dashboard/Dashboard.styled";
import { DashboardParameterList } from "../DashboardParameterList";
import { Button } from "@mantine/core";
import { Modal } from "metabase/ui";
import { t } from "ttag";
import { LoadingSpinner } from "metabase/common/components/EntityPicker";
import axios from "axios";

interface DashboardParameterPanelProps {
  isFullscreen: boolean;
  selectedTabId?: number | any;
}

export function DashboardParameterPanel({
  isFullscreen,
  selectedTabId,
}: DashboardParameterPanelProps) {
  const dashboard = useSelector(getDashboardComplete);
  const parameters = useSelector(getParameters);
  const hiddenParameterSlugs = useSelector(getTabHiddenParameterSlugs);
  const isEditing = useSelector(getIsEditing);
  const isNightMode = useSelector(getIsNightMode);
  const visibleParameters = getVisibleParameters(
    parameters,
    hiddenParameterSlugs,
  );
  const hasVisibleParameters = visibleParameters.length > 0;
  const shouldRenderAsNightMode = isNightMode && isFullscreen;

  const parameterPanelRef = useRef<HTMLElement>(null);
  const allowSticky = isParametersWidgetContainersSticky(
    visibleParameters.length,
  );
  const { isSticky, isStickyStateChanging } = useIsParameterPanelSticky({
    parameterPanelRef,
  });
  const parametersValues = useSelector(getValuePopulatedParameters);
  const [isOpenModalId, setIsOpenModalId] = useState<string | number>("");
  const shouldApplyThemeChangeTransition = !isStickyStateChanging && isSticky;



  if (!hasVisibleParameters) {
    return null;
  }

  if (isEditing) {
    return (
      <span ref={parameterPanelRef}>
        <ParametersWidgetContainer
          allowSticky
          isSticky
          isNightMode={shouldRenderAsNightMode}
          data-testid="edit-dashboard-parameters-widget-container"
        >
          <FixedWidthContainer
            isFixedWidth={dashboard?.width === "fixed"}
            data-testid="fixed-width-filters"
          >
            <DashboardParameterList isFullscreen={isFullscreen} />
          </FixedWidthContainer>
        </ParametersWidgetContainer>
      </span>
    );
  }

  const apiCall = async(payload: any)=>{
    try {
      axios
      .post("http://127.0.0.1:5000/api/v1/metabase/getDashboardDetailsbyId", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((response:any) => {
        console.log("✅ Response:.....", response.data);
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          console.error("❌ Axios error:....", error.message, error.toJSON?.());
        } else {
          console.error("❌ Unknown error:.....", error);
        }
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard details:....", error);
    }
  }

  const filtersWithOutNullValues = parametersValues
  ?.filter((filter: any) => filter?.value !== null)
  ?.map((filter: any) => {
    return {
      [filter?.slug]: filter?.value,
    };
  })
  .reduce((acc: any, item: any) => ({ ...acc, ...item }), {});

  const payload = {
    dashboardId: dashboard?.id,
    tabId: selectedTabId,
    ...filtersWithOutNullValues,
  };


  const renderModal = (tabId: number | string, dashboard:any) => {
    return (
      <Modal
        size="30rem"
        opened={tabId === isOpenModalId}
        onClose={() => {
          setIsOpenModalId("");
        }}
        title={t`Render Tab Insight`}
      >
        Tab level with filters tabId:{tabId} dashboardId:{dashboard?.id}
        <LoadingSpinner />
      </Modal>
    );
  };

  return (
    <span ref={parameterPanelRef}>
      {selectedTabId === isOpenModalId && renderModal(selectedTabId, dashboard)}
      <ParametersWidgetContainer
        className={cx({
          [TransitionS.transitionThemeChange]: shouldApplyThemeChangeTransition,
        })}
        allowSticky={allowSticky}
        isSticky={isSticky}
        isNightMode={shouldRenderAsNightMode}
        data-testid="dashboard-parameters-widget-container"
      >
        <ParametersFixedWidthContainer
          id={DASHBOARD_PARAMETERS_PDF_EXPORT_NODE_ID}
          isFixedWidth={dashboard?.width === "fixed"}
          data-testid="fixed-width-filters"
        >
          <DashboardParameterList isFullscreen={isFullscreen} />

          <FilterApplyButton />
          {/* <Button
            style={{ marginTop: "7px" }}
            onClick={() => {
              setIsOpenModalId(selectedTabId);
              apiCall(payload)
            }}
          >
            View Insight
          </Button> */}
        </ParametersFixedWidthContainer>
      </ParametersWidgetContainer>
    </span>
  );
}

function isParametersWidgetContainersSticky(parameterCount: number) {
  if (!isSmallScreen()) {
    return true;
  }

  // Sticky header with more than 5 parameters
  // takes too much space on small screens
  return parameterCount <= 5;
}
