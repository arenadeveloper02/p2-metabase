import cx from "classnames";
import { useCallback, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

import { Ellipsified } from "metabase/core/components/Ellipsified";
import Markdown from "metabase/core/components/Markdown";
import Tooltip from "metabase/core/components/Tooltip";
import CS from "metabase/css/core/index.css";
import DashboardS from "metabase/css/dashboard.module.css";
import EmbedFrameS from "metabase/public/components/EmbedFrame/EmbedFrame.module.css";
import type { IconProps } from "metabase/ui";
import { Image, Modal } from "metabase/ui";
import LegendActions from "./LegendActions";
import {
  LegendCaptionRoot,
  LegendDescriptionIcon,
  LegendLabel,
  LegendLabelIcon,
  LegendRightContent,
} from "./LegendCaption.styled";
import { t } from "ttag";
import { LoadingSpinner } from "metabase/common/components/EntityPicker";
import axios from "axios";
import { getValuePopulatedParameters } from "metabase/dashboard/selectors";
import { useSelector } from "metabase/lib/redux";
import CustomMarkdownText from "metabase/core/components/Markdown/CustomMarkdown";

function shouldHideDescription(width: number | undefined) {
  const HIDE_DESCRIPTION_THRESHOLD = 100;
  return width != null && width < HIDE_DESCRIPTION_THRESHOLD;
}
type ParamValue = string | string[] | null | undefined;

interface ParameterItem {
  name: string;
  value: ParamValue;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

type FilterPayload = Record<string, string | string[] | DateRange>;

export function buildFilterObject(
  parametersValues: ParameterItem[],
): FilterPayload {
  const result: FilterPayload = {};

  for (const item of parametersValues) {
    const val = item?.value;

    const isEmpty =
      val == null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty || item.name === "Date(Prev)") continue;

    if (item.name === "Date(Current)" && typeof val === "string") {
      const [startDate, endDate] = val.split("~");
      result["Date"] = { startDate, endDate };
    } else {
      const key = item?.name?.replace(/\s+/g, "_");
      result[key] = val;
    }
  }

  return result;
}

/**
 * Using non-empty href will ensure that a focusable link is rendered.
 * We need a focusable element to handle onFocus.
 * (Using a div with tabIndex={0} breaks the sequence of focusable elements)
 */
const HREF_PLACEHOLDER = "#";

interface LegendCaptionProps {
  className?: string;
  title: string;
  description?: string;
  getHref?: () => string | undefined;
  icon?: IconProps;
  actionButtons?: React.ReactNode;
  onSelectTitle?: () => void;
  width?: number;
  dashcard?: any;
}

export const LegendCaption = ({
  className,
  title,
  description,
  getHref,
  icon,
  actionButtons,
  onSelectTitle,
  width,
  dashcard,
}: LegendCaptionProps) => {
  /*
   * Optimization: lazy computing the href on title focus & mouseenter only.
   * Href computation uses getNewCardUrl, which makes a few MLv2 calls,
   * which are expensive.
   * It's a performance issue on dashboards that have hundreds of dashcards
   * (during initial render and after changing dashboard parameters which can
   * potentially affect the href).
   */
  const [href, setHref] = useState(getHref ? HREF_PLACEHOLDER : undefined);
  const [isOpenModalId, setIsOpenModalId] = useState("");
  const parametersValues = useSelector(getValuePopulatedParameters);
  const [responseData, setResponseData] = useState<any>({});
  const markdownRef = useRef<any>();
  const VIMI_SPARKLE_IMAGE_URL =
    "https://arenav2image.s3.us-west-1.amazonaws.com/vimi-sparkle.png";

  const handleFocus = useCallback(() => {
    if (getHref) {
      setHref(getHref());
    }
  }, [getHref]);

  const handleMouseEnter = useCallback(() => {
    if (getHref) {
      setHref(getHref());
    }
  }, [getHref]);

  const apiCall = async (payload: any) => {
    try {
      axios
        .post(
          "http://52.39.126.122:5000/api/v1/metabase/getDashboardDetailsbyId",
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
        .then((response: any) => {
          setResponseData({ response: response.data, localStatus: "success" });
          console.log("✅ Response:.....", response.data);
        })
        .catch(error => {
          if (axios.isAxiosError(error)) {
            setResponseData({
              response: "Somthing went wrong!",
              localStatus: "failed",
            });
            console.error(
              "❌ Axios error:....",
              error.message,
              error.toJSON?.(),
            );
          }
        });
    } catch (error) {
      setResponseData({
        response: "Somthing went wrong!",
        localStatus: "failed",
      });
      console.error("❌ Error fetching dashboard details:....", error);
    }
  };

  const renderModal = (cardId: number | string) => {
    return (
      <Modal
        size="50rem"
        opened={cardId === isOpenModalId}
        onClose={() => {
          setResponseData({});
          setIsOpenModalId("");
        }}
        // title={t`Calibrate Insight`}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            position: "absolute",
            top: "20px",
            zIndex: "2000",
          }}
        >
          <div
            style={{
              background: "linear-gradient(#8F50AC, #0086AB)",
              cursor: "pointer",
              height: "48px",
              width: "48px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={VIMI_SPARKLE_IMAGE_URL}
              style={{
                height: "32px",
                width: "32px",
              }}
              alt="vimi"
            />
          </div>
          <h2 className="text-[#4A4A4A] text-[18px] ">Calibrate Insight</h2>
        </div>
        <div
          style={{
            marginTop: "34px",
            maxHeight: "calc(100vh - 260px)",
            overflowY: "auto",
            paddingRight: "12px"
          }}
        >
          {
            <CustomMarkdownText
              markdown={
                responseData?.response?.response || responseData?.response || ""
              }
              markdownRef={markdownRef}
            />
          }
          {/* <Markdown dark disallowHeading unstyleLinks >
              {responseData?.response?.response || responseData?.response}
            </Markdown> */}
        </div>
        {!responseData?.localStatus && <LoadingSpinner />}
      </Modal>
    );
  };

  return (
    <LegendCaptionRoot className={className} data-testid="legend-caption">
      {icon && <LegendLabelIcon {...icon} />}
      <LegendLabel
        className={cx(
          DashboardS.fullscreenNormalText,
          DashboardS.fullscreenNightText,
          EmbedFrameS.fullscreenNightText,
        )}
        href={href}
        onClick={onSelectTitle}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
      >
        <Ellipsified data-testid="legend-caption-title">{title}</Ellipsified>
      </LegendLabel>
      <LegendRightContent>
        {dashcard?.id === isOpenModalId && renderModal(dashcard?.id)}
        <Tooltip
          tooltip={
            <Markdown dark disallowHeading unstyleLinks lineClamp={8}>
              {"Insight"}
            </Markdown>
          }
          maxWidth="22em"
        >
          {dashcard?.dashboard_id === 81 &&
            dashcard?.visualization_settings?.["table.pivot_column"] && (
              <div
                onClick={() => {
                  setResponseData({});
                  setIsOpenModalId(dashcard?.id || "");
                  apiCall({
                    dashboardId: dashcard?.dashboard_id,
                    tabId: dashcard?.dashboard_tab_id,
                    dashcardId: dashcard?.id,
                    tabFilters: buildFilterObject(parametersValues),
                  });
                }}
              >
                <LegendDescriptionIcon
                  name="lightbulb"
                  className={cx(
                    CS.cursorPointer,
                    CS.hoverChild,
                    CS.hoverChildSmooth,
                  )}
                />
              </div>
            )}
        </Tooltip>
        {description && !shouldHideDescription(width) && (
          <Tooltip
            tooltip={
              <Markdown dark disallowHeading unstyleLinks lineClamp={8}>
                {description}
              </Markdown>
            }
            maxWidth="22em"
          >
            <LegendDescriptionIcon
              name="info"
              className={cx(CS.hoverChild, CS.hoverChildSmooth)}
            />
          </Tooltip>
        )}
        {actionButtons && <LegendActions>{actionButtons}</LegendActions>}
      </LegendRightContent>
    </LegendCaptionRoot>
  );
};
