// eslint-disable-next-line no-restricted-imports
import { css } from "@emotion/react";
// eslint-disable-next-line no-restricted-imports
import styled from "@emotion/styled";

import { Ellipsified } from "metabase/common/components/Ellipsified";

export const TextScalarRoot = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;

interface TextScalarContainerProps {
  isClickable: boolean;
  hoverColor?: string;
}

export const TextScalarContainer = styled(Ellipsified, {
  shouldForwardProp: (prop) => prop !== "isClickable" && prop !== "hoverColor",
})<TextScalarContainerProps>`
  padding: 0 var(--mantine-spacing-sm);
  max-width: 100%;
  box-sizing: border-box;

  ${({ isClickable, hoverColor }) =>
    isClickable &&
    css`
      cursor: pointer;

      .textscalar-hover {
        transition: color 0.2s ease;
      }

      .textscalar-hover:hover {
        color: ${hoverColor || "var(--mb-color-brand)"} !important;
      }
    `}
`;

